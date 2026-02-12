import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.ssactivewear.com/v2";

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

/**
 * Backfill pricing for existing ss_activewear master_products.
 * 
 * For each product without pricing (or all if force=true):
 *  1. Look up catalog_styles to get the numeric styleID
 *  2. Fetch products from S&S API
 *  3. Extract core-size piecePrice → base_price, mapPrice → msrp
 *  4. Upsert per-size pricing into product_size_pricing
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
    const limitCount = body.limit || 500;

    // Get ss_activewear products needing pricing
    let query = db
      .from("master_products")
      .select("id, source_sku, supplier_item_number, style_code, pricing_override")
      .eq("source", "ss_activewear")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(limitCount);

    if (!force) {
      query = query.is("pricing_synced_at", null);
    }

    // Exclude overridden products
    query = query.eq("pricing_override", false);

    const { data: products, error: queryErr } = await query;
    if (queryErr) throw queryErr;

    console.log(`[SS Backfill Pricing] Found ${products?.length || 0} products to process`);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No products need pricing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build style_code → styleID mapping from catalog_styles
    const styleCodes = products.map((p) => p.style_code || p.source_sku).filter(Boolean);
    const supplierItems = products.map((p) => p.supplier_item_number).filter(Boolean);

    const orParts: string[] = [];
    for (const s of styleCodes) orParts.push(`style_name.eq.${s}`);
    for (const s of supplierItems) orParts.push(`part_number.eq.${s}`);

    const { data: catalogRows } = orParts.length > 0
      ? await db.from("catalog_styles").select("style_id, style_name, part_number").or(orParts.join(","))
      : { data: [] };

    // Map: style_code/source_sku → style_id
    const styleIdMap = new Map<string, number>();
    for (const row of catalogRows || []) {
      if (row.style_name) styleIdMap.set(row.style_name, row.style_id);
      if (row.part_number) styleIdMap.set(row.part_number, row.style_id);
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let resolved = 0;
    const CORE_SIZES = new Set(["XS", "S", "M", "L", "XL"]);

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

        let ssProducts: SSProduct[] = [];

        if (resp.ok) {
          const data = await resp.json();
          ssProducts = Array.isArray(data) ? data : [];
        } else {
          await resp.text(); // consume body
          console.warn(`[SS Backfill] Products API ${resp.status} for style=${lookupKey}`);
        }

        // If products call returned empty/failed and we don't have a styleId,
        // try resolving via the styles endpoint (handles numeric part numbers)
        if (ssProducts.length === 0 && !styleId) {
          console.log(`[SS Backfill] Attempting styles API resolution for: ${lookupKey}`);
          const stylesResp = await fetch(
            `${SS_BASE}/styles?style=${encodeURIComponent(lookupKey)}`,
            { headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" } }
          );

          const stylesRemaining = parseInt(stylesResp.headers.get("X-Rate-Limit-Remaining") || "100", 10);

          if (stylesResp.ok) {
            const stylesData = await stylesResp.json();
            const styles = Array.isArray(stylesData) ? stylesData : [];
            if (styles.length > 0) {
              const resolvedStyleName = styles[0].styleName;
              const resolvedStyleId = styles[0].styleID;
              console.log(`[SS Backfill] Resolved ${lookupKey} → styleName=${resolvedStyleName}, styleID=${resolvedStyleId}`);

              // Fix the style_code on the master_product so future syncs work
              await db.from("master_products").update({
                style_code: resolvedStyleName,
                source_sku: resolvedStyleName,
                supplier_item_number: styles[0].partNumber || product.supplier_item_number,
              }).eq("id", product.id);
              resolved++;

              // Now fetch products with the correct styleID
              const retryResp = await fetch(`${SS_BASE}/products/${resolvedStyleId}`, {
                headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
              });
              if (retryResp.ok) {
                const retryData = await retryResp.json();
                ssProducts = Array.isArray(retryData) ? retryData : [];
              } else {
                await retryResp.text();
              }
            }
          } else {
            await stylesResp.text();
          }

          if (stylesRemaining < 5) {
            await new Promise((r) => setTimeout(r, 12000));
          }
        }

        if (ssProducts.length === 0) {
          skipped++;
          if (remaining < 3) await new Promise((r) => setTimeout(r, 15000));
          continue;
        }

        // Extract pricing by size (deduplicated - use first color's pricing per size)
        const sizeMap = new Map<string, { piece: number; dozen: number; case_: number; map: number; isUpcharge: boolean }>();
        for (const p of ssProducts) {
          if (!p.sizeName || sizeMap.has(p.sizeName)) continue;
          const isCore = CORE_SIZES.has(p.sizeName) ||
            (p.sizePriceCodeName || "").toLowerCase().includes("xs-xl") ||
            (p.sizePriceCodeName || "").toLowerCase().includes("s-xl");
          sizeMap.set(p.sizeName, {
            piece: p.piecePrice || 0,
            dozen: p.dozenPrice || 0,
            case_: p.casePrice || 0,
            map: p.mapPrice || 0,
            isUpcharge: !isCore,
          });
        }

        // Find core-size base price (lowest piecePrice among core sizes)
        let basePrice: number | null = null;
        let msrp: number | null = null;

        for (const [, info] of sizeMap) {
          if (!info.isUpcharge && info.piece > 0) {
            if (basePrice === null || info.piece < basePrice) {
              basePrice = info.piece;
            }
          }
          if (info.map > 0.01 && (msrp === null || info.map > msrp)) {
            msrp = info.map;
          }
        }

        // If no core-size pricing found, use the lowest overall
        if (basePrice === null) {
          for (const [, info] of sizeMap) {
            if (info.piece > 0 && (basePrice === null || info.piece < basePrice)) {
              basePrice = info.piece;
            }
          }
        }

        // Update master_products
        const { error: updateErr } = await db
          .from("master_products")
          .update({
            base_price: basePrice,
            msrp: msrp && msrp > 0.01 ? msrp : null,
            pricing_synced_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateErr) {
          console.error(`[SS Backfill] Update error for ${product.id}: ${updateErr.message}`);
          errors++;
          continue;
        }

        // Upsert per-size pricing
        const sizeRows = Array.from(sizeMap.entries()).map(([sizeName, info]) => ({
          master_product_id: product.id,
          size_name: sizeName,
          piece_price: info.piece || null,
          dozen_price: info.dozen || null,
          case_price: info.case_ || null,
          is_upcharge: info.isUpcharge,
        }));

        if (sizeRows.length > 0) {
          const { error: sizeErr } = await db
            .from("product_size_pricing")
            .upsert(sizeRows, { onConflict: "master_product_id,size_name" });
          if (sizeErr) {
            console.warn(`[SS Backfill] Size pricing error for ${product.id}: ${sizeErr.message}`);
          }
        }

        updated++;

        // Rate limiting
        if (remaining < 5) {
          console.log(`[SS Backfill] Rate limit low (${remaining}), waiting 12s...`);
          await new Promise((r) => setTimeout(r, 12000));
        } else if (remaining < 20) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (err) {
        console.error(`[SS Backfill] Error for product ${product.id}:`, err);
        errors++;
      }
    }

    console.log(`[SS Backfill Pricing] Done: ${updated} updated, ${skipped} skipped, ${errors} errors, ${resolved} style_codes resolved`);

    return new Response(JSON.stringify({
      success: true,
      processed: products.length,
      updated,
      skipped,
      errors,
      resolved,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SS Backfill Pricing] Fatal error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
