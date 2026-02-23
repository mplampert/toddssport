import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";

// ── Known Champro ProductMaster codes organized by sport ──
// These are verified Champro product families. Add more as discovered.
const KNOWN_PRODUCT_MASTERS: Record<string, { codes: string[]; sport: string; category: string }> = {
  // Stock Jerseys (from shop.champrosports.com/category/870)
  "stock-jerseys": {
    codes: ["BS25", "BS36W", "BS86", "BS80", "BS82", "BS84", "BS28", "BS23", "BS37", "BS30", "BST21"],
    sport: "baseball",
    category: "JERSEYS",
  },
  // Custom Jerseys (from shop.champrosports.com/category/869)
  "custom-jerseys": {
    codes: [
      "JSBJ34", "JSBJ3", "JSBJ32", "JSBJ1", "JSBJ24", "JSBJ26",
      "JSBJ20", "JSBJ30", "JSBJ28", "JSBJ2", "JSBJ22",
      "JBST8W", "JSBJ20_RT", "JSBJ30_RT", "JTHB01",
    ],
    sport: "softball",
    category: "JERSEYS",
  },
  // Stock Pants (from shop.champrosports.com/category/872)
  "stock-pants": {
    codes: ["BP62", "BP20", "BP11", "BP11P", "BP11K", "BP31", "BP23", "BP39", "BP28"],
    sport: "baseball",
    category: "PANTS",
  },
  // Caps & Visors (from shop.champrosports.com/category/592)
  caps: {
    codes: ["HBO1", "HC7", "HC8", "HC1", "HC10", "HC2", "HC3", "HC4", "HC5"],
    sport: "accessories",
    category: "ACCESSORIES",
  },
  // Stock products from API docs / verified working
  "stock-misc": {
    codes: ["BBS44", "HJ2", "A068"],
    sport: "baseball",
    category: "JERSEYS",
  },
};

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

    // Accept optional body with additional ProductMaster codes
    let extraCodes: string[] = [];
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.productMasters && Array.isArray(body.productMasters)) {
          extraCodes = body.productMasters;
        }
      } catch { /* no body */ }
    }

    // Option to sync a specific sport or all
    const specificSport = url.searchParams.get("sport");

    // Build the list of ProductMaster codes to sync
    const codesToSync: Array<{ code: string; sport: string; category: string }> = [];

    for (const [sportKey, info] of Object.entries(KNOWN_PRODUCT_MASTERS)) {
      if (specificSport && sportKey !== specificSport) continue;
      for (const code of info.codes) {
        codesToSync.push({ code, sport: info.sport, category: info.category });
      }
    }

    // Add extra codes from request body (default to baseball if no sport specified)
    for (const code of extraCodes) {
      if (!codesToSync.some(c => c.code === code)) {
        codesToSync.push({ code, sport: "unknown", category: "JERSEYS" });
      }
    }

    console.log(`Starting Champro catalog sync for ${codesToSync.length} ProductMaster codes...`);

    const results: SyncResult[] = [];
    const allProducts: Array<Record<string, unknown>> = [];

    for (const item of codesToSync) {
      const { code, sport, category } = item;
      console.log(`\n=== Fetching ProductInfo for ${code} ===`);

      try {
        const infoUrl = `${CHAMPRO_BASE_URL}/api/Order/ProductInfo?ProductMaster=${encodeURIComponent(code)}&APICustomerKey=${encodeURIComponent(CHAMPRO_API_KEY)}`;
        const response = await proxyFetch(infoUrl, "GET");

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${code}] API returned ${response.status}: ${errorText}`);
          results.push({ productMaster: code, sport, status: "error", skuCount: 0, uniqueSkuCount: 0, leadTimes: [], error: `HTTP ${response.status}` });
          continue;
        }

        const data: ProductInfoResponse = await response.json();

        if (data.Error) {
          console.error(`[${code}] API error: ${data.Error}`);
          results.push({ productMaster: code, sport, status: "error", skuCount: 0, uniqueSkuCount: 0, leadTimes: [], error: data.Error });
          continue;
        }

        if (!data.ProductSKUs || data.ProductSKUs.length === 0) {
          console.log(`[${code}] No SKUs returned`);
          results.push({ productMaster: code, sport, status: "no_skus", skuCount: 0, uniqueSkuCount: 0, leadTimes: [] });
          // Still create a category entry
          allProducts.push({
            product_master: code,
            sku: null,
            name: code,
            sport,
            category,
            moq_custom: data.MOQCustom || 0,
            default_lead_time_name: data.AvailableLeadTimes?.[0]?.LeadTimeName || null,
            type: "category",
            msrp: null,
            has_sizes: false,
            parent_category: null,
          });
          continue;
        }

        // Deduplicate SKUs (API returns duplicates)
        const uniqueSkus = new Map<string, typeof data.ProductSKUs[0]>();
        for (const sku of data.ProductSKUs) {
          const key = `${sku.SKU}-${sku.Size}`;
          if (!uniqueSkus.has(key)) {
            uniqueSkus.set(key, sku);
          }
        }

        // Determine product name from the ProductMaster
        const productName = data.ProductMaster;

        // Get available sizes and colors
        const sizes = new Set<string>();
        const colors = new Set<string>();
        const configurations = new Set<string>();
        for (const sku of uniqueSkus.values()) {
          if (sku.Size) sizes.add(sku.Size);
          if (sku.Color) colors.add(sku.Color);
          if (sku.Configuration) configurations.add(sku.Configuration);
        }

        const leadTimeNames = (data.AvailableLeadTimes || []).map(lt => lt.LeadTimeName);
        const defaultLeadTime = leadTimeNames[0] || null;

        // Create a master product entry
        allProducts.push({
          product_master: code,
          sku: null,
          name: productName,
          sport,
          category,
          moq_custom: data.MOQCustom || 0,
          default_lead_time_name: defaultLeadTime,
          type: uniqueSkus.size > 0 ? "product" : "category",
          msrp: null,
          has_sizes: sizes.size > 0,
          parent_category: null,
        });

        console.log(`[${code}] Found ${uniqueSkus.size} unique SKUs, ${sizes.size} sizes, ${colors.size} colors, ${configurations.size} configs`);
        console.log(`[${code}] Lead times: ${leadTimeNames.join(", ")}`);

        results.push({
          productMaster: code,
          sport,
          status: "success",
          skuCount: data.ProductSKUs.length,
          uniqueSkuCount: uniqueSkus.size,
          leadTimes: leadTimeNames,
        });

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[${code}] Error: ${errorMsg}`);
        results.push({ productMaster: code, sport, status: "error", skuCount: 0, uniqueSkuCount: 0, leadTimes: [], error: errorMsg });
      }
    }

    // Upsert products to database
    let upsertedCount = 0;
    const upsertErrors: string[] = [];

    if (allProducts.length > 0) {
      console.log(`\nUpserting ${allProducts.length} products to database...`);
      const chunkSize = 50;
      for (let i = 0; i < allProducts.length; i += chunkSize) {
        const chunk = allProducts.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("champro_products")
          .upsert(chunk, { onConflict: "product_master", ignoreDuplicates: false })
          .select();

        if (error) {
          console.error(`Upsert error: ${error.message}`);
          upsertErrors.push(error.message);
        } else {
          upsertedCount += data?.length || 0;
        }
      }
    }

    const summary = {
      totalCodes: codesToSync.length,
      successCount: results.filter(r => r.status === "success").length,
      errorCount: results.filter(r => r.status === "error").length,
      noSkusCount: results.filter(r => r.status === "no_skus").length,
      productsUpserted: upsertedCount,
      upsertErrors: upsertErrors.length > 0 ? upsertErrors : undefined,
    };

    console.log("\n=== SYNC SUMMARY ===");
    console.log(JSON.stringify(summary, null, 2));
    for (const result of results) {
      const icon = result.status === "success" ? "✓" : result.status === "no_skus" ? "⚠" : "✗";
      console.log(`${icon} [${result.productMaster}] ${result.sport}: ${result.uniqueSkuCount} unique SKUs (${result.status})${result.error ? ` - ${result.error}` : ""}`);
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
