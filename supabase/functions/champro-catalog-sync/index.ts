import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";

// ── Champro Custom Builder categories ──
// These map to the 26 Custom Builder embed categories from Champro's docs.
// Each entry has a categoryId (used in the CB embed URL) and sport mapping.
const CUSTOM_BUILDER_CATEGORIES: Array<{
  categoryId: number;
  name: string;
  sport: string;
  category: string;
}> = [
  { categoryId: 1154, name: "BASEBALL", sport: "baseball", category: "JERSEYS" },
  { categoryId: 1155, name: "FASTPITCH", sport: "softball", category: "JERSEYS" },
  { categoryId: 1159, name: "MEN'S BASKETBALL", sport: "basketball", category: "JERSEYS" },
  { categoryId: 1160, name: "WOMEN'S BASKETBALL", sport: "basketball", category: "JERSEYS" },
  { categoryId: 1158, name: "FOOTBALL", sport: "football", category: "JERSEYS" },
  { categoryId: 1168, name: "HOCKEY", sport: "hockey", category: "JERSEYS" },
  { categoryId: 1217, name: "MEN'S SPORTSWEAR", sport: "sportswear", category: "JERSEYS" },
  { categoryId: 1219, name: "WOMEN'S SPORTSWEAR", sport: "sportswear", category: "JERSEYS" },
  { categoryId: 1161, name: "MEN'S VOLLEYBALL", sport: "volleyball", category: "JERSEYS" },
  { categoryId: 1162, name: "WOMEN'S VOLLEYBALL", sport: "volleyball", category: "JERSEYS" },
  { categoryId: 1164, name: "MEN'S SOCCER", sport: "soccer", category: "JERSEYS" },
  { categoryId: 1165, name: "WOMEN'S SOCCER", sport: "soccer", category: "JERSEYS" },
  { categoryId: 1248, name: "MEN'S TRACK", sport: "track", category: "JERSEYS" },
  { categoryId: 1249, name: "WOMEN'S TRACK", sport: "track", category: "JERSEYS" },
  { categoryId: 1251, name: "MEN'S LACROSSE", sport: "lacrosse", category: "JERSEYS" },
  { categoryId: 1252, name: "WOMEN'S LACROSSE", sport: "lacrosse", category: "JERSEYS" },
  { categoryId: 1157, name: "SPLASH SHIRTS", sport: "splash-shirts", category: "JERSEYS" },
  { categoryId: 1156, name: "CAPS", sport: "accessories", category: "ACCESSORIES" },
  { categoryId: 1171, name: "7V7", sport: "7v7", category: "JERSEYS" },
  { categoryId: 1172, name: "WRESTLING", sport: "wrestling", category: "JERSEYS" },
  { categoryId: 1209, name: "SLOWPITCH", sport: "softball", category: "JERSEYS" },
  { categoryId: 1542, name: "REALTREE®", sport: "realtree", category: "JERSEYS" },
  { categoryId: 1566, name: "JUICE 5-DAY PROGRAM", sport: "baseball", category: "JERSEYS" },
  { categoryId: 1567, name: "LEGACY COLLECTION", sport: "baseball", category: "JERSEYS" },
  { categoryId: 1590, name: "SLAM DUNK 5-DAY PROGRAM", sport: "basketball", category: "JERSEYS" },
];

// ── Fixie proxy helper ──
async function proxyFetch(url: string, method: string, body?: unknown): Promise<Response> {
  const proxyUrl = Deno.env.get("FIXIE_PROXY_URL");

  if (proxyUrl) {
    const parsed = new URL(proxyUrl);
    let client: Deno.HttpClient | null = null;
    try {
      client = Deno.createHttpClient({
        proxy: {
          url: `${parsed.protocol}//${parsed.host}`,
          basicAuth: {
            username: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
          },
        },
      });
      return await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        // @ts-ignore - Deno client option for proxy
        client,
      });
    } finally {
      if (client) client.close();
    }
  }

  console.warn("No FIXIE_PROXY_URL configured, calling directly");
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

interface ProductInfoResponse {
  ProductMaster: string;
  MOQ: number;
  MOQCustom: number;
  ProductSKUs: Array<{
    SKU: string;
    Configuration: string;
    Fabric: string;
    Color: string;
    Size: string;
    Customized: string;
  }>;
  AvailableLeadTimes: Array<{
    LeadTimeName: string;
    LeadTime: string;
    LeadTimeCharge: string;
  }>;
  Error: string | null;
}

interface SyncResult {
  productMaster: string;
  sport: string;
  status: "success" | "error" | "no_skus";
  skuCount: number;
  uniqueSkuCount: number;
  leadTimes: string[];
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CHAMPRO_API_KEY = Deno.env.get("CHAMPRO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!CHAMPRO_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);

    // Option to sync a specific sport
    const specificSport = url.searchParams.get("sport");
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.sport && !specificSport) {
          // allow POST body sport filter too
        }
      } catch { /* no body */ }
    }

    // Filter categories if a sport is specified
    const categoriesToSync = specificSport
      ? CUSTOM_BUILDER_CATEGORIES.filter(c => c.sport === specificSport)
      : CUSTOM_BUILDER_CATEGORIES;

    console.log(`Starting Champro Custom Builder catalog sync for ${categoriesToSync.length} categories...`);

    const results: SyncResult[] = [];
    const allProducts: Array<Record<string, unknown>> = [];

    for (const cb of categoriesToSync) {
      console.log(`\n=== Syncing Custom Builder category: ${cb.name} (ID: ${cb.categoryId}) ===`);

      // Create a catalog entry for each Custom Builder category
      const productMasterKey = `CB-${cb.categoryId}`;
      allProducts.push({
        product_master: productMasterKey,
        sku: null,
        name: cb.name,
        sport: cb.sport,
        category: cb.category,
        moq_custom: 12, // Default MOQ for custom products
        default_lead_time_name: "Standard",
        type: "product",
        msrp: null,
        has_sizes: true,
        parent_category: null,
      });

      results.push({
        productMaster: productMasterKey,
        sport: cb.sport,
        status: "success",
        skuCount: 0,
        uniqueSkuCount: 0,
        leadTimes: ["Standard"],
      });

      console.log(`[${cb.name}] Created catalog entry as ${productMasterKey}`);
    }

    // Upsert products to database
    let upsertedCount = 0;
    const upsertErrors: string[] = [];

    if (allProducts.length > 0) {
      console.log(`\nUpserting ${allProducts.length} Custom Builder categories to database...`);
      const { data, error } = await supabase
        .from("champro_products")
        .upsert(allProducts, { onConflict: "product_master", ignoreDuplicates: false })
        .select();

      if (error) {
        console.error(`Upsert error: ${error.message}`);
        upsertErrors.push(error.message);
      } else {
        upsertedCount = data?.length || 0;
      }
    }

    const summary = {
      totalCategories: categoriesToSync.length,
      successCount: results.filter(r => r.status === "success").length,
      errorCount: results.filter(r => r.status === "error").length,
      productsUpserted: upsertedCount,
      upsertErrors: upsertErrors.length > 0 ? upsertErrors : undefined,
    };

    console.log("\n=== SYNC SUMMARY ===");
    console.log(JSON.stringify(summary, null, 2));
    for (const result of results) {
      console.log(`✓ [${result.productMaster}] ${result.sport}`);
    }

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Catalog sync error:", error);
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
