import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.ssactivewear.com/v2";
const SS_MEDIA_BASE = "https://www.ssactivewear.com/";

interface SSProduct {
  styleID: number;
  styleName: string;
  colorName?: string;
  colorCode?: string;
  colorSwatchImage?: string;
  colorFrontImage?: string;
  colorBackImage?: string;
  colorSideImage?: string;
  colorDirectSideImage?: string;
  color1?: string;
  color2?: string;
  sizeName?: string;
}

function resolveImage(val: string | undefined | null): string | null {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  return `${SS_MEDIA_BASE}${val}`;
}

/**
 * Backfill color images for existing ss_activewear master_products.
 *
 * For each product without images_synced_at (or all if force=true):
 *  1. Look up catalog_styles to get the numeric styleID
 *  2. Fetch products from S&S API
 *  3. Extract per-color image URLs
 *  4. Upsert into product_color_images
 */
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(supabaseUrl, serviceKey);
  const basicAuth = btoa(`${ssAccount}:${ssKey}`);

  try {
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const limitCount = body.limit || 200;

    // Get ss_activewear products needing image sync
    let query = db
      .from("master_products")
      .select("id, source_sku, supplier_item_number, style_code")
      .eq("source", "ss_activewear")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(limitCount);

    if (!force) {
      query = query.is("images_synced_at", null);
    }

    const { data: products, error: queryErr } = await query;
    if (queryErr) throw queryErr;

    console.log(`[SS Backfill Images] Found ${products?.length || 0} products to process`);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No products need image sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build style_code → styleID mapping from catalog_styles
    const styleCodes = products.map((p) => p.style_code || p.source_sku).filter(Boolean);
    const supplierItems = products.map((p) => p.supplier_item_number).filter(Boolean);

    const orClauses: string[] = [];
    for (const s of styleCodes) orClauses.push(`style_name.eq.${s}`);
    for (const s of supplierItems) orClauses.push(`part_number.eq.${s}`);

    const { data: catalogRows } = orClauses.length > 0
      ? await db.from("catalog_styles").select("style_id, style_name, part_number").or(orClauses.join(","))
      : { data: [] };

    const styleIdMap = new Map<string, number>();
    for (const row of catalogRows || []) {
      if (row.style_name) styleIdMap.set(row.style_name, row.style_id);
      if (row.part_number) styleIdMap.set(row.part_number, row.style_id);
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      const lookupKey = product.style_code || product.source_sku;
      const styleId = styleIdMap.get(lookupKey) || styleIdMap.get(product.supplier_item_number);

      try {
        const apiUrl = styleId
          ? `${SS_BASE}/products/${styleId}`
          : `${SS_BASE}/products?style=${encodeURIComponent(lookupKey)}`;

        const resp = await fetch(apiUrl, {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
        });

        const remaining = parseInt(resp.headers.get("X-Rate-Limit-Remaining") || "100", 10);

        if (!resp.ok) {
          console.error(`[SS Backfill Images] API error for ${product.source_sku}: ${resp.status}`);
          errors++;
          if (remaining < 3) await new Promise((r) => setTimeout(r, 15000));
          continue;
        }

        const ssProducts: SSProduct[] = await resp.json();
        if (!Array.isArray(ssProducts) || ssProducts.length === 0) {
          skipped++;
          continue;
        }

        // Deduplicate by color name – one row per color
        const colorMap = new Map<string, {
          color_code: string | null;
          swatch: string | null;
          front: string | null;
          back: string | null;
          side: string | null;
          direct_side: string | null;
          color1: string | null;
          color2: string | null;
        }>();

        for (const p of ssProducts) {
          if (!p.colorName || colorMap.has(p.colorName)) continue;
          colorMap.set(p.colorName, {
            color_code: p.colorCode || null,
            swatch: resolveImage(p.colorSwatchImage),
            front: resolveImage(p.colorFrontImage),
            back: resolveImage(p.colorBackImage),
            side: resolveImage(p.colorSideImage),
            direct_side: resolveImage(p.colorDirectSideImage),
            color1: p.color1 || null,
            color2: p.color2 || null,
          });
        }

        const imageRows = Array.from(colorMap.entries()).map(([colorName, img]) => ({
          master_product_id: product.id,
          color_name: colorName,
          color_code: img.color_code,
          swatch_image_url: img.swatch,
          front_image_url: img.front,
          back_image_url: img.back,
          side_image_url: img.side,
          direct_side_image_url: img.direct_side,
          color1: img.color1,
          color2: img.color2,
          synced_at: new Date().toISOString(),
        }));

        if (imageRows.length > 0) {
          // Batch upsert in chunks of 50
          for (let i = 0; i < imageRows.length; i += 50) {
            const chunk = imageRows.slice(i, i + 50);
            const { error: upsertErr } = await db
              .from("product_color_images")
              .upsert(chunk, { onConflict: "master_product_id,color_name" });
            if (upsertErr) {
              console.warn(`[SS Backfill Images] Upsert error for ${product.id}: ${upsertErr.message}`);
            }
          }
        }

        // Mark product as images-synced
        await db.from("master_products")
          .update({ images_synced_at: new Date().toISOString() })
          .eq("id", product.id);

        updated++;

        // Rate limiting
        if (remaining < 5) {
          console.log(`[SS Backfill Images] Rate limit low (${remaining}), waiting 12s...`);
          await new Promise((r) => setTimeout(r, 12000));
        } else if (remaining < 20) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (err) {
        console.error(`[SS Backfill Images] Error for product ${product.id}:`, err);
        errors++;
      }
    }

    console.log(`[SS Backfill Images] Done: ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      processed: products.length,
      updated,
      skipped,
      errors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SS Backfill Images] Fatal error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
