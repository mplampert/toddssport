import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const SS_BASE = "https://api.ssactivewear.com/v2";
const SS_MEDIA_BASE = "https://www.ssactivewear.com/";
const CORE_SIZES = new Set(["XS", "S", "M", "L", "XL"]);
const BATCH_SIZE = 100;

function resolveImage(val: string | undefined | null): string | null {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  return `${SS_MEDIA_BASE}${val}`;
}

/**
 * Cron-triggered S&S remediation: runs Phase 1 then loops Phase 2 through all products.
 * No user auth required — called by pg_cron with service role.
 */
serve(async (req) => {
  // Allow cron calls (no CORS needed, but keep OPTIONS for safety)
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ssAccount = Deno.env.get("SS_ACTIVEWEAR_ACCOUNT");
  const ssKey = Deno.env.get("SS_ACTIVEWEAR_API_KEY");

  if (!ssAccount || !ssKey) {
    console.error("[SS Cron] S&S credentials not configured");
    return new Response(JSON.stringify({ error: "S&S credentials not configured" }), { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceKey);
  const basicAuth = btoa(`${ssAccount}:${ssKey}`);

  try {
    // ── Phase 1: Fix style codes ──
    console.log("[SS Cron] Starting Phase 1...");
    const stylesResp = await fetch(`${SS_BASE}/styles`, {
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
    });
    if (!stylesResp.ok) throw new Error(`Styles fetch failed: ${stylesResp.status}`);

    const allStyles = await stylesResp.json();
    console.log(`[SS Cron] Phase 1: ${allStyles.length} styles from API`);

    const styleMap = new Map<string, any>();
    const partToStyle = new Map<string, string>();
    for (const s of allStyles) {
      const key = s.styleName || String(s.styleID);
      styleMap.set(key, s);
      if (s.partNumber && s.styleName && s.partNumber !== s.styleName) {
        partToStyle.set(s.partNumber, s.styleName);
      }
    }

    // Fetch all ss_activewear products
    let allProducts: any[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await db
        .from("master_products")
        .select("id, style_code, source_sku, supplier_item_number, name, base_price, msrp, pricing_override")
        .eq("source", "ss_activewear")
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allProducts = allProducts.concat(data);
      if (data.length < 1000) break;
      page++;
    }

    let p1Fixed = 0;
    for (const product of allProducts) {
      const currentStyleCode = product.style_code || product.source_sku;
      let ssStyle = styleMap.get(currentStyleCode);
      if (!ssStyle && product.source_sku) {
        const c = partToStyle.get(product.source_sku);
        if (c) ssStyle = styleMap.get(c);
      }
      if (!ssStyle && product.supplier_item_number) {
        const c = partToStyle.get(product.supplier_item_number);
        if (c) ssStyle = styleMap.get(c);
      }
      if (!ssStyle) continue;

      const correctStyleCode = ssStyle.styleName || String(ssStyle.styleID);
      const correctName = ssStyle.title || ssStyle.styleName;
      if (product.style_code === correctStyleCode && product.source_sku === correctStyleCode) continue;

      const { error } = await db.from("master_products").update({
        style_code: correctStyleCode,
        source_sku: correctStyleCode,
        supplier_item_number: ssStyle.partNumber || product.supplier_item_number,
        name: correctName || product.name,
      }).eq("id", product.id);
      if (!error) p1Fixed++;
    }
    console.log(`[SS Cron] Phase 1 done: ${p1Fixed} fixed`);

    // ── Phase 2: Loop through all products for pricing + colors ──
    let offset = 0;
    let totalPricing = 0;
    let totalColors = 0;
    let totalErrors = 0;
    let totalProcessed = 0;

    while (true) {
      const { data: batch, error: bErr } = await db
        .from("master_products")
        .select("id, style_code, source_sku, pricing_override")
        .eq("source", "ss_activewear")
        .eq("active", true)
        .order("created_at", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (bErr) throw bErr;
      if (!batch || batch.length === 0) break;

      for (const product of batch) {
        const styleCode = product.style_code || product.source_sku;
        if (!styleCode) continue;

        try {
          const apiUrl = `${SS_BASE}/products?style=${encodeURIComponent(styleCode)}`;
          const resp = await fetch(apiUrl, {
            headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
          });
          const remaining = parseInt(resp.headers.get("X-Rate-Limit-Remaining") || "100", 10);

          if (!resp.ok) {
            totalErrors++;
            if (remaining < 3) await new Promise((r) => setTimeout(r, 15000));
            continue;
          }

          const ssProducts = await resp.json();
          if (!Array.isArray(ssProducts) || ssProducts.length === 0) continue;

          // Pricing
          if (!product.pricing_override) {
            const sizeMap = new Map<string, any>();
            for (const p of ssProducts) {
              if (!p.sizeName || sizeMap.has(p.sizeName)) continue;
              const isCore = CORE_SIZES.has(p.sizeName) ||
                (p.sizePriceCodeName || "").toLowerCase().includes("xs-xl") ||
                (p.sizePriceCodeName || "").toLowerCase().includes("s-xl");
              sizeMap.set(p.sizeName, {
                piece: p.piecePrice || 0, dozen: p.dozenPrice || 0,
                case_: p.casePrice || 0, map: p.mapPrice || 0, isUpcharge: !isCore,
              });
            }

            let basePrice: number | null = null;
            let msrp: number | null = null;
            for (const [, info] of sizeMap) {
              if (!info.isUpcharge && info.piece > 0) {
                if (basePrice === null || info.piece < basePrice) basePrice = info.piece;
              }
              if (info.map > 0.01 && (msrp === null || info.map > msrp)) msrp = info.map;
            }
            if (basePrice === null) {
              for (const [, info] of sizeMap) {
                if (info.piece > 0 && (basePrice === null || info.piece < basePrice)) basePrice = info.piece;
              }
            }

            await db.from("master_products").update({
              base_price: basePrice,
              msrp: msrp && msrp > 0.01 ? msrp : null,
              pricing_synced_at: new Date().toISOString(),
            }).eq("id", product.id);

            const sizeRows = Array.from(sizeMap.entries()).map(([sizeName, info]) => ({
              master_product_id: product.id, size_name: sizeName,
              piece_price: info.piece || null, dozen_price: info.dozen || null,
              case_price: info.case_ || null, is_upcharge: info.isUpcharge,
            }));
            if (sizeRows.length > 0) {
              await db.from("product_size_pricing").upsert(sizeRows, { onConflict: "master_product_id,size_name" });
            }
            totalPricing++;
          }

          // Color images
          const colorMap = new Map<string, any>();
          for (const p of ssProducts) {
            if (!p.colorName || colorMap.has(p.colorName)) continue;
            colorMap.set(p.colorName, {
              color_code: p.colorCode || null,
              swatch: resolveImage(p.colorSwatchImage),
              front: resolveImage(p.colorFrontImage),
              back: resolveImage(p.colorBackImage),
              side: resolveImage(p.colorSideImage),
              direct_side: resolveImage(p.colorDirectSideImage),
              color1: p.color1 || null, color2: p.color2 || null,
            });
          }

          const imageRows = Array.from(colorMap.entries()).map(([colorName, img]) => ({
            master_product_id: product.id, color_name: colorName,
            color_code: img.color_code, swatch_image_url: img.swatch,
            front_image_url: img.front, back_image_url: img.back,
            side_image_url: img.side, direct_side_image_url: img.direct_side,
            color1: img.color1, color2: img.color2,
            synced_at: new Date().toISOString(),
          }));

          if (imageRows.length > 0) {
            for (let i = 0; i < imageRows.length; i += 50) {
              await db.from("product_color_images").upsert(
                imageRows.slice(i, i + 50),
                { onConflict: "master_product_id,color_name" }
              );
            }
            totalColors += imageRows.length;
          }

          await db.from("master_products").update({
            images_synced_at: new Date().toISOString(),
          }).eq("id", product.id);

          if (remaining < 5) await new Promise((r) => setTimeout(r, 12000));
          else if (remaining < 20) await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          console.error(`[SS Cron P2] Error for ${styleCode}:`, err);
          totalErrors++;
        }
      }

      totalProcessed += batch.length;
      offset += BATCH_SIZE;
      if (batch.length < BATCH_SIZE) break;
    }

    const summary = { p1Fixed, totalProcessed, totalPricing, totalColors, totalErrors };
    console.log("[SS Cron] Complete:", JSON.stringify(summary));

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SS Cron] Fatal:", err);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 500 });
  }
});
