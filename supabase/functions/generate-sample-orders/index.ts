import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRST_NAMES = ["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Quinn", "Drew", "Blake", "Sam", "Jamie", "Chris", "Pat", "Dana", "Kelly", "Robin", "Lee", "Cameron", "Skyler"];
const LAST_NAMES = ["Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "White", "Harris", "Clark"];
const STATUSES = ["draft", "open", "open", "open", "completed", "completed", "completed", "cancelled"];
const FULFILLMENT_METHODS = ["ship", "ship", "ship", "pickup", "deliver_to_coach"];
const FULFILLMENT_STATUSES = ["unfulfilled", "unfulfilled", "in_progress", "fulfilled"];
const SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(rand(8, 20), rand(0, 59), rand(0, 59));
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role using service role client
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userId = claimsData.claims.sub;
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { storeId, count = 15 } = await req.json();
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId required" }), { status: 400, headers: corsHeaders });
    }

    // Get store products
    const { data: products } = await adminClient
      .from("team_store_products")
      .select("id, display_name, price_override, style_id, catalog_styles(style_name)")
      .eq("team_store_id", storeId)
      .eq("active", true);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ error: "No products in store. Add products first." }), { status: 400, headers: corsHeaders });
    }

    const orderCount = Math.min(count, 50);
    const createdOrders: string[] = [];

    for (let i = 0; i < orderCount; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const status = pick(STATUSES);
      const createdAt = randomDate(30);
      const itemCount = rand(2, Math.min(5, products.length));

      // Pick random products for line items
      const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount);
      const lineItems = shuffled.map((p: any) => {
        const qty = rand(1, 4);
        const price = Number(p.price_override) || rand(15, 65);
        return {
          team_store_product_id: p.id,
          product_name_snapshot: p.display_name || p.catalog_styles?.style_name || `Style ${p.style_id}`,
          variant_snapshot: { size: pick(SIZES), color: "Default" },
          quantity: qty,
          unit_price: price,
          line_total: qty * price,
        };
      });

      const subtotal = lineItems.reduce((s, i) => s + i.line_total, 0);
      const taxTotal = Math.round(subtotal * 0.07 * 100) / 100;
      const shippingTotal = pick([0, 0, 5.99, 8.99, 12.99]);
      const total = Math.round((subtotal + taxTotal + shippingTotal) * 100) / 100;

      const orderNumber = `SAMPLE-${Date.now().toString(36).toUpperCase()}-${i}`;

      const { data: order, error: orderErr } = await adminClient
        .from("team_store_orders")
        .insert({
          store_id: storeId,
          order_number: orderNumber,
          source: "manual",
          is_sample: true,
          status,
          customer_name: `${firstName} ${lastName}`,
          customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          customer_phone: `(${rand(200, 999)}) ${rand(200, 999)}-${rand(1000, 9999)}`,
          fulfillment_method: pick(FULFILLMENT_METHODS),
          fulfillment_status: status === "completed" ? "fulfilled" : pick(FULFILLMENT_STATUSES),
          subtotal,
          tax_total: taxTotal,
          shipping_total: shippingTotal,
          discount_total: 0,
          total,
          internal_notes: "Auto-generated sample order",
          created_at: createdAt,
        })
        .select("id")
        .single();

      if (orderErr) {
        console.error("Order insert error:", orderErr);
        continue;
      }

      // Insert line items
      await adminClient
        .from("team_store_order_items")
        .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));

      // For completed/open orders, add a payment
      if (status === "completed" || (status === "open" && Math.random() > 0.4)) {
        const payAmount = status === "completed" ? total : Math.round(total * pick([0.5, 0.75, 1]) * 100) / 100;
        await adminClient
          .from("team_store_payments")
          .insert({
            order_id: order.id,
            type: "payment",
            method: pick(["cash", "check", "card", "venmo"]),
            amount: payAmount,
            provider: "manual",
            note: "Sample payment",
          });
      }

      createdOrders.push(order.id);
    }

    return new Response(
      JSON.stringify({ success: true, count: createdOrders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
