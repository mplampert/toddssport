import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, data?: unknown) =>
  console.log(`[ORDER-PI] ${step}${data ? ` – ${JSON.stringify(data)}` : ""}`);

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

  // Auth check – admin only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getUser();
  if (claimsErr || !claimsData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check admin role
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", claimsData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });

  try {
    const body = await req.json();
    const { action } = body;

    // ---- CREATE PAYMENT INTENT ----
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

      const pi = await stripe.paymentIntents.create({
        amount: Math.round(amount), // in cents
        currency: "usd",
        customer: customerId,
        metadata: {
          order_id: orderId,
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

    // ---- REFUND ----
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
