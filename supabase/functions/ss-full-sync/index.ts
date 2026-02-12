import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.ssactivewear.com/v2";
const SS_MEDIA_BASE = "https://www.ssactivewear.com/";

interface SSBrandEntry {
  brandID: number;
  name: string;
  image?: string;
  activeProducts?: number;
}

interface SSStyle {
  styleID: number;
  styleName: string;
  brandName: string;
  title?: string;
  description?: string;
  baseCategory?: string;
  styleImage?: string;
  brandImage?: string;
  partNumber?: string;
}

interface SSProduct {
  styleID: number;
  styleName: string;
  sizeName: string;
  sizePriceCodeName?: string;
  piecePrice?: number;
  dozenPrice?: number;
  casePrice?: number;
  mapPrice?: number;
  salePrice?: number;
  colorName?: string;
}

interface SSProduct {
  styleID: number;
  styleName: string;
  sizeName: string;
  sizePriceCodeName?: string;
  piecePrice?: number;
  dozenPrice?: number;
  casePrice?: number;
  mapPrice?: number;
  salePrice?: number;
  colorName?: string;
}

function resolveImage(val: string | undefined | null): string | null {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  return `${SS_MEDIA_BASE}${val}`;
}

const catMap: Record<string, string> = {
  "T-Shirts": "tee",
  "T-Shirts - Short Sleeve": "tee",
  "T-Shirts - Long Sleeve": "tee",
  "Fleece": "hoodie",
  "Sweatshirts/Fleece": "hoodie",
  "Polos/Knits": "polo",
  "Caps": "hat",
  "Headwear": "hat",
  "Woven Shirts": "woven",
  "Pants/Shorts": "pants",
  "Outerwear": "outerwear",
  "Bags": "bag",
  "Accessories": "accessory",
  "Activewear": "activewear",
  "Infant/Toddler": "youth",
  "Youth": "youth",
  "Ladies": "activewear",
  "Performance/Training": "activewear",
};

function mapCategory(baseCategory: string | undefined): string {
  if (!baseCategory) return "other";
  return catMap[baseCategory] || baseCategory.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ssAccount = Deno.env.get("SS_ACTIVEWEAR_ACCOUNT");
  const ssKey = Deno.env.get("SS_ACTIVEWEAR_API_KEY");

  if (!ssAccount || !ssKey) {
    return new Response(JSON.stringify({ error: "S&S credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify admin auth
  const authHeader = req.headers.get("authorization") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(supabaseUrl, serviceKey);
  const basicAuth = btoa(`${ssAccount}:${ssKey}`);

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark job as running
    await db.from("ss_import_jobs").update({
      status: "running",
      started_at: new Date().toISOString(),
    }).eq("id", job_id);

    // Step 1: Fetch all S&S brands
    console.log("[SS Full Sync] Fetching brands list...");
    const brandsResp = await fetch(`${SS_BASE}/brands`, {
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
    });

    if (!brandsResp.ok) {
      throw new Error(`Failed to fetch brands: ${brandsResp.status}`);
    }

    const ssBrands: SSBrandEntry[] = await brandsResp.json();
    console.log(`[SS Full Sync] Got ${ssBrands.length} brands from API`);

    // Upsert all brands into brands table
    for (const b of ssBrands) {
      const logoUrl = resolveImage(b.image);
      await db.from("brands").upsert(
        { name: b.name, logo_url: logoUrl },
        { onConflict: "name" }
      );
    }

    // Build brand name → brand_id map
    const { data: allBrands } = await db.from("brands").select("id, name");
    const brandIdMap = new Map<string, string>();
    for (const b of allBrands || []) {
      brandIdMap.set(b.name, b.id);
    }

    // Step 2: Fetch ALL styles (single request - the S&S API returns all styles at once)
    console.log("[SS Full Sync] Fetching complete styles catalog...");
    
    await db.from("ss_import_jobs").update({
      current_brand: "Fetching full catalog...",
      brands_total: ssBrands.length,
    }).eq("id", job_id);

    const stylesResp = await fetch(`${SS_BASE}/styles`, {
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
    });

    if (!stylesResp.ok) {
      throw new Error(`Failed to fetch styles: ${stylesResp.status}`);
    }

    const allStyles: SSStyle[] = await stylesResp.json();
    const totalFetched = Array.isArray(allStyles) ? allStyles.length : 0;
    console.log(`[SS Full Sync] Got ${totalFetched} total styles from API`);

    await db.from("ss_import_jobs").update({
      current_brand: `Processing ${totalFetched} styles...`,
      products_imported: 0,
    }).eq("id", job_id);

    // Group styles by brand for logging
    const brandGroups = new Map<string, SSStyle[]>();
    for (const s of allStyles) {
      const existing = brandGroups.get(s.brandName) || [];
      existing.push(s);
      brandGroups.set(s.brandName, existing);
    }

    const log: Array<{ brand: string; fetched: number; written: number; error?: string }> = [];
    let totalWritten = 0;
    let brandsProcessed = 0;

    // Step 3: Process each brand's styles and upsert
    for (const [brandName, styles] of brandGroups) {
      brandsProcessed++;
      const brandId = brandIdMap.get(brandName) || null;

      if (!brandId) {
        console.warn(`[SS Full Sync] No brand_id for "${brandName}", creating...`);
        const brandImage = resolveImage(styles[0]?.brandImage);
        const { data: newBrand } = await db.from("brands")
          .upsert({ name: brandName, logo_url: brandImage }, { onConflict: "name" })
          .select("id")
          .single();
        if (newBrand) {
          brandIdMap.set(brandName, newBrand.id);
        }
      }

      const resolvedBrandId = brandIdMap.get(brandName) || null;

      try {
        const rows = styles.map((s) => ({
          brand_id: resolvedBrandId,
          name: s.title || s.styleName,
          category: mapCategory(s.baseCategory),
          product_type: "blank_apparel",
          source: "ss_activewear",
          source_sku: s.styleName || String(s.styleID),
          supplier_item_number: s.partNumber || null,
          image_url: resolveImage(s.styleImage),
          description_short: s.description?.substring(0, 200) || null,
          active: true,
        }));

        let written = 0;
        for (let j = 0; j < rows.length; j += 100) {
          const chunk = rows.slice(j, j + 100);
          const { data: inserted, error: upsertErr } = await db
            .from("master_products")
            .upsert(chunk, { onConflict: "source,source_sku", ignoreDuplicates: false })
            .select("id");

          if (upsertErr) {
            console.error(`[SS Full Sync] Upsert error for ${brandName}: ${upsertErr.message}`);
            // Try smaller batches
            for (const row of chunk) {
              const { error: singleErr } = await db
                .from("master_products")
                .upsert(row, { onConflict: "source,source_sku", ignoreDuplicates: false });
              if (!singleErr) written++;
            }
          } else {
            written += inserted?.length || chunk.length;
          }
        }

        totalWritten += written;
        log.push({ brand: brandName, fetched: styles.length, written });

        // Update progress every brand
        if (brandsProcessed % 5 === 0 || brandsProcessed === brandGroups.size) {
          await db.from("ss_import_jobs").update({
            current_brand: brandName,
            brands_completed: brandsProcessed,
            brands_total: brandGroups.size,
            products_imported: totalWritten,
            log,
          }).eq("id", job_id);
        }
      } catch (brandErr: unknown) {
        const msg = brandErr instanceof Error ? brandErr.message : String(brandErr);
        console.error(`[SS Full Sync] Error processing ${brandName}:`, msg);
        log.push({ brand: brandName, fetched: styles.length, written: 0, error: msg });
      }
    }

    // Mark complete
    await db.from("ss_import_jobs").update({
      status: "completed",
      brands_completed: brandGroups.size,
      brands_total: brandGroups.size,
      current_brand: null,
      products_imported: totalWritten,
      log,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);

    console.log(`[SS Full Sync] Job ${job_id} completed: ${totalWritten} products from ${brandGroups.size} brands (${totalFetched} fetched from API)`);

    return new Response(JSON.stringify({
      success: true,
      totalFetched,
      totalWritten,
      brandsCount: brandGroups.size,
      log,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SS Full Sync] Fatal error:", err);

    // Try to update job status
    try {
      const { job_id } = await req.json().catch(() => ({ job_id: null }));
      if (job_id) {
        await db.from("ss_import_jobs").update({
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
          completed_at: new Date().toISOString(),
        }).eq("id", job_id);
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
