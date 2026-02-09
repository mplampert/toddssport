import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { storeId } = await req.json();
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId required" }), { status: 400, headers: corsHeaders });
    }

    // Get sample order IDs for this store
    const { data: sampleOrders } = await adminClient
      .from("team_store_orders")
      .select("id")
      .eq("store_id", storeId)
      .eq("is_sample", true);

    if (!sampleOrders || sampleOrders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = sampleOrders.map((o: any) => o.id);

    // Delete payments, items, then orders (cascade should handle but be explicit)
    await adminClient.from("team_store_payments").delete().in("order_id", ids);
    await adminClient.from("team_store_order_items").delete().in("order_id", ids);
    const { error } = await adminClient.from("team_store_orders").delete().in("id", ids);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, deleted: ids.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
