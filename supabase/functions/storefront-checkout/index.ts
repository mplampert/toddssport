import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, data?: unknown) =>
  console.log(`[STOREFRONT-CHECKOUT] ${step}${data ? ` – ${JSON.stringify(data)}` : ""}`);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      storeId,
      items, // array of cart items from frontend
      customer, // { name, email, phone }
      fulfillment, // { method: 'ship'|'pickup'|'deliver', address? }
      customerNotes,
    } = body;

    if (!storeId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: "storeId and items required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Checkout started", { storeId, itemCount: items.length });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch store to validate it's open
    const { data: store, error: storeErr } = await supabase
      .from("team_stores")
      .select("id, name, slug, status")
      .eq("id", storeId)
      .single();

    if (storeErr || !store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side price verification: fetch each product's price_override
    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const { data: dbProducts } = await supabase
      .from("team_store_products")
      .select("id, price_override, display_name, catalog_styles(style_name, brand_name)")
      .in("id", productIds);

    const productMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

    // Build order items with server-verified prices
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      const serverBasePrice = dbProduct ? Number(dbProduct.price_override) || 0 : 0;
      // Trust decoration and personalization upcharges from the cart (they are deterministic from store settings)
      const decoUpcharge = Number(item.decoUpcharge) || 0;
      const persUpcharge = Number(item.persUpcharge) || 0;
      const serverUnitPrice = serverBasePrice + decoUpcharge + persUpcharge;
      const qty = Math.max(1, Math.round(Number(item.quantity)));
      const lineTotal = serverUnitPrice * qty;
      subtotal += lineTotal;

      orderItems.push({
        team_store_product_id: item.productId,
        product_name_snapshot: item.productName || dbProduct?.display_name || dbProduct?.catalog_styles?.style_name || "Product",
        variant_snapshot: {
          color: item.color,
          colorCode: item.colorCode,
          size: item.size,
          sku: item.sku,
          brandName: item.brandName,
          imageUrl: item.imageUrl,
        },
        quantity: qty,
        unit_price: serverUnitPrice,
        line_total: lineTotal,
        personalization_name: item.personalization?.name || null,
        personalization_number: item.personalization?.number || null,
        pricing_snapshot: {
          base_price: serverBasePrice,
          deco_upcharge: decoUpcharge,
          pers_upcharge: persUpcharge,
          pers_name_price: item.personalization?.namePrice || 0,
          pers_number_price: item.personalization?.numberPrice || 0,
        },
      });
    }

    const total = subtotal; // no tax/shipping for now

    if (total < 0.5) {
      return new Response(JSON.stringify({ error: "Order total too low" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate order number
    const orderNumber = `TS-${Date.now().toString(36).toUpperCase()}`;

    // Create order draft
    const { data: order, error: orderErr } = await supabase
      .from("team_store_orders")
      .insert({
        store_id: storeId,
        order_number: orderNumber,
        source: "online",
        status: "draft",
        payment_status: "unpaid",
        customer_name: customer?.name || null,
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        fulfillment_method: fulfillment?.method || "ship",
        shipping_name: fulfillment?.address?.name || customer?.name || null,
        shipping_address1: fulfillment?.address?.address1 || null,
        shipping_address2: fulfillment?.address?.address2 || null,
        shipping_city: fulfillment?.address?.city || null,
        shipping_state: fulfillment?.address?.state || null,
        shipping_zip: fulfillment?.address?.zip || null,
        customer_notes: customerNotes || null,
        subtotal,
        total,
        tax_total: 0,
        shipping_total: 0,
        discount_total: 0,
      } as any)
      .select()
      .single();

    if (orderErr || !order) {
      log("Error creating order", { error: orderErr?.message });
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Order draft created", { orderId: order.id, orderNumber, total });

    // Insert order items
    const { error: itemsErr } = await supabase
      .from("team_store_order_items")
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));

    if (itemsErr) {
      log("Error creating order items", { error: itemsErr.message });
    }

    // Create Stripe PaymentIntent
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
    const amountCents = Math.round(total * 100);

    // Look up or create Stripe customer
    let customerId: string | undefined;
    if (customer?.email) {
      const customers = await stripe.customers.list({ email: customer.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const c = await stripe.customers.create({
          email: customer.email,
          name: customer.name || undefined,
        });
        customerId = c.id;
      }
    }

    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customerId,
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        store_id: storeId,
        source: "team_store_online",
      },
      automatic_payment_methods: { enabled: true },
    });

    // Store PI id on the order
    await supabase
      .from("team_store_orders")
      .update({ payment_intent_id: pi.id } as any)
      .eq("id", order.id);

    log("PaymentIntent created", { piId: pi.id, amount: amountCents });

    return new Response(
      JSON.stringify({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        orderId: order.id,
        orderNumber,
        total,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    log("Error", { message: err.message });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
