import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, data?: unknown) =>
  console.log(`[ORDER-PI] ${step}${data ? ` – ${JSON.stringify(data)}` : ""}`);

async function requireAdmin(req: Request, supabaseUrl: string, supabaseAnonKey: string, supabaseServiceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getUser();
  if (claimsErr || !claimsData?.user) return false;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", claimsData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!roleRow;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ---- RECORD PAYMENT (storefront checkout – no auth required) ----
    // Security: We verify the payment with Stripe server-side before recording.
    if (action === "record_payment") {
      const { orderId, paymentIntentId } = body;
      if (!orderId || typeof orderId !== "string" || orderId.length > 100) {
        return new Response(JSON.stringify({ error: "Valid orderId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!paymentIntentId || typeof paymentIntentId !== "string" || !paymentIntentId.startsWith("pi_")) {
        return new Response(JSON.stringify({ error: "Valid paymentIntentId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Recording payment", { orderId, paymentIntentId });

      // Verify payment with Stripe
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return new Response(JSON.stringify({ error: "Payment not successful" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify order exists and PI matches metadata
      const { data: order } = await supabase
        .from("team_store_orders")
        .select("id, total, payment_intent_id")
        .eq("id", orderId)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify PI matches what's on the order
      if (order.payment_intent_id && order.payment_intent_id !== paymentIntentId) {
        return new Response(JSON.stringify({ error: "Payment intent mismatch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also verify PI metadata matches (prevents using a PI from a different order)
      if (pi.metadata?.order_id && pi.metadata.order_id !== orderId) {
        return new Response(JSON.stringify({ error: "Payment intent does not belong to this order" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for duplicate payment record
      const { data: existingPayment } = await supabase
        .from("team_store_payments")
        .select("id")
        .eq("order_id", orderId)
        .eq("provider_ref", paymentIntentId)
        .maybeSingle();

      if (existingPayment) {
        log("Payment already recorded, skipping", { orderId, paymentIntentId });
        return new Response(
          JSON.stringify({ success: true, alreadyRecorded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update order status
      await supabase
        .from("team_store_orders")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("id", orderId);

      // Insert payment record
      await supabase.from("team_store_payments").insert({
        order_id: orderId,
        type: "payment",
        method: "card",
        amount: pi.amount / 100,
        provider: "stripe",
        provider_ref: paymentIntentId,
        note: `Online checkout – PI ${paymentIntentId}`,
      });

      log("Payment recorded", { orderId, amount: pi.amount / 100 });

      // Send order confirmation email + SMS via send-notification
      try {
        const notifRes = await fetch(
          `${supabaseUrl}/functions/v1/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              order_id: orderId,
              template_key: "order_confirmation",
              source: "standard_store",
            }),
          }
        );
        log("Order confirmation notification triggered", { status: notifRes.status });
      } catch (notifErr: any) {
        log("Error sending order notification (non-fatal)", { message: notifErr.message });
      }

      // Also send order detail emails (customer receipt + internal alert)
      try {
        const { data: fullOrder } = await supabase
          .from("team_store_orders")
          .select("*, team_store_order_items(*), team_stores(name)")
          .eq("id", orderId)
          .single();

        if (fullOrder && (fullOrder.billing_email || fullOrder.customer_email)) {
          const items = (fullOrder.team_store_order_items || []).map((i: any) => ({
            name: i.product_name_snapshot || "Product",
            size: i.variant_snapshot?.size || "",
            quantity: i.quantity,
            price: i.unit_price,
          }));

          const shipTo = fullOrder.fulfillment_snapshot || {};
          const storeName = (fullOrder.team_stores as any)?.name || "";

          const emailRes = await fetch(
            `${supabaseUrl}/functions/v1/send-order-emails`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                orderId,
                po: fullOrder.order_number || orderId,
                orderDate: fullOrder.created_at || new Date().toISOString(),
                customerEmail: fullOrder.billing_email || fullOrder.customer_email || "",
                customerName: fullOrder.billing_name || fullOrder.customer_name || "",
                customerPhone: fullOrder.billing_phone || fullOrder.customer_phone || "",
                shipTo: {
                  firstName: shipTo.shipping_name?.split(" ")[0] || "",
                  lastName: shipTo.shipping_name?.split(" ").slice(1).join(" ") || "",
                  address: shipTo.shipping_address1 || "",
                  address2: shipTo.shipping_address2 || "",
                  city: shipTo.shipping_city || "",
                  stateCode: shipTo.shipping_state || "",
                  zipCode: shipTo.shipping_zip || "",
                  countryCode: "US",
                  phone: shipTo.shipping_phone || "",
                },
                items,
                subtotal: fullOrder.subtotal || 0,
                tax: fullOrder.tax_total || 0,
                shipping: fullOrder.shipping_total || 0,
                total: fullOrder.total || 0,
                teamName: storeName || undefined,
                stripeSessionId: paymentIntentId,
              }),
            }
          );
          log("Order detail emails triggered", { status: emailRes.status });
        }
      } catch (emailErr: any) {
        log("Error sending order emails (non-fatal)", { message: emailErr.message });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- All other actions require admin auth ----
    const isAdmin = await requireAdmin(req, supabaseUrl, supabaseAnonKey, supabaseServiceKey);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- CREATE PAYMENT INTENT (admin only) ----
    if (action === "create_intent") {
      const { orderId, amount, customerEmail, customerName } = body;
      if (!orderId || !amount || amount < 50) {
        return new Response(JSON.stringify({ error: "orderId and amount (≥50 cents) required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Creating PaymentIntent", { orderId, amount });

      // Look up or create Stripe customer
      let customerId: string | undefined;
      if (customerEmail) {
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const c = await stripe.customers.create({
            email: customerEmail,
            name: customerName || undefined,
          });
          customerId = c.id;
        }
      }

      // Look up store_id from the order
      const { data: orderRow } = await supabase
        .from("team_store_orders")
        .select("store_id, team_stores(name)")
        .eq("id", orderId)
        .single();

      const pi = await stripe.paymentIntents.create({
        amount: Math.round(amount), // in cents
        currency: "usd",
        customer: customerId,
        metadata: {
          order_id: orderId,
          store_id: orderRow?.store_id || "",
          store_name: (orderRow?.team_stores as any)?.name || "",
          source: "team_store_manual",
        },
        automatic_payment_methods: { enabled: true },
      });

      log("PaymentIntent created", { id: pi.id, amount: pi.amount });

      return new Response(
        JSON.stringify({ clientSecret: pi.client_secret, paymentIntentId: pi.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- REFUND (admin only) ----
    if (action === "refund") {
      const { paymentIntentId, amount, orderId, note } = body;
      if (!paymentIntentId) {
        return new Response(JSON.stringify({ error: "paymentIntentId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Creating refund", { paymentIntentId, amount });

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };
      if (amount) {
        refundParams.amount = Math.round(amount); // cents
      }

      const refund = await stripe.refunds.create(refundParams);
      log("Refund created", { id: refund.id, amount: refund.amount, status: refund.status });

      // Record in our payments ledger
      if (orderId) {
        await supabase.from("team_store_payments").insert({
          order_id: orderId,
          type: "refund",
          method: "card",
          amount: refund.amount / 100, // dollars
          provider: "stripe",
          provider_ref: refund.id,
          note: note || `Stripe refund ${refund.id}`,
        });
      }

      return new Response(
        JSON.stringify({ refundId: refund.id, amount: refund.amount, status: refund.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    log("Error", { message: err.message });
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
