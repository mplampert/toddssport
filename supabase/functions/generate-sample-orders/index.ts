import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── helpers ─────────────────────────────────────────────── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function money(n: number) {
  return Math.round(n * 100) / 100;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rand(8, 18), rand(0, 59), 0, 0);
  return d.toISOString();
}
function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ── seed data arrays ────────────────────────────────────── */
const ORGS = [
  "Lincoln High School",
  "Riverside Academy",
  "Central Youth League",
  "West Side FC",
  "Eagles Booster Club",
  "Northfield Lacrosse",
  "Maple Grove Swim",
  "Ironside CrossFit",
  "Summit Church",
  "Valley Elite Cheer",
];
const SEASONS = ["Spring 2025", "Fall 2025", "Winter 2025-26", "Spring 2026"];
const SPORTS = ["football", "baseball", "basketball", "soccer", "volleyball", "lacrosse"];
const STATUSES_STORE = ["draft", "live", "live", "live", "closed", "closed", "closed"];
const FIRST = ["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Quinn", "Drew", "Blake", "Sam", "Jamie", "Chris", "Pat", "Dana", "Kelly"];
const LAST = ["Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson", "Thomas"];
const SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL"];
const COLORS = ["Black", "Navy", "Red", "Royal", "White", "Grey", "Maroon"];
const FULFILLMENT = ["ship", "ship", "ship", "pickup", "deliver_to_coach"];
const PAYMENT_METHODS = ["cash", "check", "card", "venmo"];

const PRODUCTS = [
  { name: "Performance Tee", price: 28, deco: "screen_print" },
  { name: "Cotton Hoodie", price: 48, deco: "screen_print" },
  { name: "Adjustable Cap", price: 22, deco: "embroidery" },
  { name: "Jogger Pants", price: 38, deco: "dtf" },
  { name: "Quarter-Zip Pullover", price: 45, deco: "embroidery" },
  { name: "Game Jersey", price: 55, deco: "screen_print", personalize: true },
  { name: "Warm-Up Jacket", price: 52, deco: "embroidery" },
  { name: "Practice Shorts", price: 25, deco: "screen_print", personalize: true },
  { name: "Crew Socks 3-Pack", price: 15, deco: "dtf" },
  { name: "Duffel Bag", price: 35, deco: "embroidery" },
];

const PLAYER_NAMES = [
  "SMITH", "JONES", "WILLIAMS", "BROWN", "JOHNSON", "DAVIS", "GARCIA",
  "MARTINEZ", "WILSON", "ANDERSON", "THOMAS", "TAYLOR", "MOORE", "JACKSON",
  "MARTIN", "LEE", "WHITE", "HARRIS", "CLARK", "LEWIS",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "generate";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    /* ── CLEAR ───────────────────────────────────────────── */
    if (action === "clear") {
      // Delete in dependency order
      await supabase.from("fundraising_payouts").delete().eq("is_sample", true);
      await supabase.from("fulfillment_batches").delete().eq("is_sample", true);
      await supabase.from("team_store_order_items").delete().eq("is_sample", true);
      await supabase.from("team_store_payments").delete().in(
        "order_id",
        (await supabase.from("team_store_orders").select("id").eq("is_sample", true)).data?.map((o: any) => o.id) ?? [],
      );
      await supabase.from("team_store_orders").delete().eq("is_sample", true);
      await supabase.from("team_store_products").delete().eq("is_sample", true);
      await supabase.from("team_stores").delete().eq("is_sample", true);

      return new Response(
        JSON.stringify({ ok: true, message: "All sample data cleared." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ── GENERATE ─────────────────────────────────────────── */
    const stats = { stores: 0, products: 0, orders: 0, lineItems: 0, batches: 0, payouts: 0 };

    // Pick a handful of real style_ids from the catalog so FK is valid
    const { data: styles } = await supabase
      .from("catalog_styles")
      .select("id, style_name")
      .eq("is_active", true)
      .limit(20);

    const styleIds = styles && styles.length > 0 ? styles.map((s: any) => s.id) : null;

    const storeIds: string[] = [];
    const storeProductMap: Record<string, any[]> = {};

    // ── 1. Create stores ────────────────────────────────
    for (let i = 0; i < 10; i++) {
      const org = ORGS[i];
      const season = pick(SEASONS);
      const status = STATUSES_STORE[i % STATUSES_STORE.length];
      const now = new Date();
      const startOff = rand(30, 90);
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - startOff);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + rand(14, 45));

      const slug = org.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + season.toLowerCase().replace(/\s+/g, "-");

      const { data: store, error: storeErr } = await supabase
        .from("team_stores")
        .insert({
          name: `${org} ${season} Store`,
          slug,
          organization: org,
          season,
          sport: pick(SPORTS),
          status,
          active: status === "live",
          start_date: dateOnly(startDate),
          end_date: dateOnly(endDate),
          open_at: startDate.toISOString(),
          close_at: endDate.toISOString(),
          primary_color: pick(["#1a365d", "#b91c1c", "#065f46", "#7e22ce", "#0c4a6e"]),
          secondary_color: pick(["#ffffff", "#f5f5f4", "#fef3c7"]),
          fundraising_percent: pick([10, 15, 20, 25]),
          fundraising_goal: pick([0, 500, 1000, 2000]),
          is_sample: true,
        })
        .select("id")
        .single();

      if (storeErr) {
        console.error("Store insert error:", storeErr);
        continue;
      }

      storeIds.push(store.id);
      stats.stores++;

      // ── 2. Products per store ───────────────────────
      const prodCount = rand(4, 8);
      const shuffledProducts = [...PRODUCTS].sort(() => Math.random() - 0.5).slice(0, prodCount);
      const storeProducts: any[] = [];

      for (let j = 0; j < shuffledProducts.length; j++) {
        const p = shuffledProducts[j];
        const styleId = styleIds ? pick(styleIds) : 1;

        const { data: prod, error: prodErr } = await supabase
          .from("team_store_products")
          .insert({
            team_store_id: store.id,
            style_id: styleId,
            display_name: p.name,
            price_override: p.price,
            sort_order: j,
            active: true,
            fundraising_enabled: true,
            fundraising_amount_per_unit: money(p.price * 0.15),
            personalization_enabled: !!p.personalize,
            personalization_price: p.personalize ? 5 : null,
            screen_print_enabled: p.deco === "screen_print",
            embroidery_enabled: p.deco === "embroidery",
            dtf_enabled: p.deco === "dtf",
            is_sample: true,
          })
          .select("id, display_name, price_override, personalization_enabled")
          .single();

        if (prodErr) {
          console.error("Product insert error:", prodErr);
          continue;
        }
        storeProducts.push(prod);
        stats.products++;
      }

      storeProductMap[store.id] = storeProducts;
    }

    // ── 3. Orders & line items ────────────────────────
    const ordersByStore: Record<string, string[]> = {};

    for (const storeId of storeIds) {
      const products = storeProductMap[storeId] || [];
      if (products.length === 0) continue;

      const orderCount = rand(8, 20);
      ordersByStore[storeId] = [];

      for (let o = 0; o < orderCount; o++) {
        const firstName = pick(FIRST);
        const lastName = pick(LAST);
        const oStatus = pick(["open", "open", "open", "completed", "completed", "completed", "cancelled"]);
        const createdAt = daysAgo(rand(1, 60));

        const itemCount = rand(1, Math.min(4, products.length));
        const chosenProducts = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount);

        const lineItems = chosenProducts.map((p: any) => {
          const qty = rand(1, 3);
          const price = Number(p.price_override) || 30;
          const personalize = p.personalization_enabled && Math.random() > 0.3;
          return {
            team_store_product_id: p.id,
            product_name_snapshot: p.display_name,
            store_display_name: p.display_name,
            variant_snapshot: { size: pick(SIZES), color: pick(COLORS) },
            quantity: qty,
            unit_price: price + (personalize ? 5 : 0),
            line_total: money(qty * (price + (personalize ? 5 : 0))),
            personalization_name: personalize ? pick(PLAYER_NAMES) : null,
            personalization_number: personalize ? String(rand(1, 99)) : null,
            is_sample: true,
          };
        });

        const subtotal = lineItems.reduce((s, li) => s + li.line_total, 0);
        const taxTotal = money(subtotal * 0.07);
        const shippingTotal = pick([0, 0, 5.99, 8.99]);
        const total = money(subtotal + taxTotal + shippingTotal);

        const orderNumber = `SAMPLE-${Date.now().toString(36).toUpperCase()}-${stats.orders}`;

        const { data: order, error: orderErr } = await supabase
          .from("team_store_orders")
          .insert({
            store_id: storeId,
            order_number: orderNumber,
            source: "manual",
            is_sample: true,
            status: oStatus,
            customer_name: `${firstName} ${lastName}`,
            customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            customer_phone: `(${rand(200, 999)}) ${rand(200, 999)}-${rand(1000, 9999)}`,
            fulfillment_method: pick(FULFILLMENT),
            fulfillment_status: oStatus === "completed" ? "fulfilled" : pick(["unfulfilled", "unfulfilled", "in_progress"]),
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
        const { error: liErr } = await supabase
          .from("team_store_order_items")
          .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));

        if (liErr) console.error("Line item error:", liErr);

        stats.orders++;
        stats.lineItems += lineItems.length;
        ordersByStore[storeId].push(order.id);

        // Payment for completed / some open orders
        if (oStatus === "completed" || (oStatus === "open" && Math.random() > 0.4)) {
          await supabase.from("team_store_payments").insert({
            order_id: order.id,
            type: "payment",
            method: pick(PAYMENT_METHODS),
            amount: oStatus === "completed" ? total : money(total * pick([0.5, 0.75, 1])),
            provider: "manual",
            note: "Sample payment",
          });
        }
      }
    }

    // ── 4. Fulfillment batches ────────────────────────
    const batchStatuses = ["ready", "in_production", "complete"];
    for (const storeId of storeIds) {
      const oids = ordersByStore[storeId] || [];
      if (oids.length < 4) continue;
      if (Math.random() < 0.3) continue; // skip some stores

      const batchCount = rand(1, 3);
      for (let b = 0; b < batchCount; b++) {
        const batchOrderIds = oids.slice(b * 3, b * 3 + rand(2, 4)).filter(Boolean);
        if (batchOrderIds.length === 0) continue;

        const { error: batchErr } = await supabase.from("fulfillment_batches").insert({
          team_store_id: storeId,
          status: pick(batchStatuses),
          batch_type: "manual",
          cutoff_datetime: daysAgo(rand(1, 20)),
          order_ids: batchOrderIds,
          notes: "Sample batch",
          is_sample: true,
        });

        if (batchErr) console.error("Batch error:", batchErr);
        else stats.batches++;
      }
    }

    // ── 5. Fundraising payouts ───────────────────────
    for (const storeId of storeIds) {
      if (Math.random() < 0.4) continue;
      const payoutCount = rand(1, 2);
      for (let p = 0; p < payoutCount; p++) {
        const { error: payErr } = await supabase.from("fundraising_payouts").insert({
          team_store_id: storeId,
          amount: pick([50, 100, 150, 200, 300, 500]),
          paid_at: dateOnly(new Date(Date.now() - rand(1, 30) * 86400000)),
          notes: "Sample payout",
          is_sample: true,
        });

        if (payErr) console.error("Payout error:", payErr);
        else stats.payouts++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Created ${stats.stores} stores, ${stats.products} products, ${stats.orders} orders, ${stats.lineItems} line items, ${stats.batches} batches, ${stats.payouts} payouts.`,
        stats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Seeder error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
