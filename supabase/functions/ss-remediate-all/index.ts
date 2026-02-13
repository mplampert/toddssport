import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.ssactivewear.com/v2";
const SS_MEDIA_BASE = "https://www.ssactivewear.com/";

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
  colorName?: string;
  colorCode?: string;
  colorSwatchImage?: string;
  colorFrontImage?: string;
  colorBackImage?: string;
  colorSideImage?: string;
  colorDirectSideImage?: string;
  color1?: string;
  color2?: string;
}

function resolveImage(val: string | undefined | null): string | null {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  return `${SS_MEDIA_BASE}${val}`;
}

const CORE_SIZES = new Set(["XS", "S", "M", "L", "XL"]);

/**
 * Batch remediation: fix style_code, source_sku, pricing, and colors for ALL S&S products.
 * 
 * Phase 1: Fetch all S&S styles, populate catalog_styles, fix style_code + source_sku.
 * Phase 2: For each product (batched), use catalog_styles for styleID, fetch pricing + colors.
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
    const phase = body.phase || 1;
    const offset = body.offset || 0;
    const limit = body.limit || 50;
    const force = body.force === true;

    if (phase === 1) {
      return await runPhase1(db, basicAuth);
    } else {
      return await runPhase2(db, basicAuth, offset, limit, force);
    }
  } catch (err) {
    console.error("[SS Remediate] Fatal error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Phase 1: Fetch ALL styles from S&S, populate catalog_styles, fix style_code + source_sku.
 */
async function runPhase1(db: any, basicAuth: string) {
  console.log("[SS Remediate Phase 1] Fetching all S&S styles...");

  const resp = await fetch(`${SS_BASE}/styles`, {
    headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch styles: ${resp.status}`);
  }

  const allStyles: SSStyle[] = await resp.json();
  console.log(`[SS Remediate Phase 1] Got ${allStyles.length} styles from API`);

  // Upsert all styles into catalog_styles for Phase 2 lookups
  const catalogRows = allStyles.map((s) => ({
    style_id: s.styleID,
    style_name: s.styleName || String(s.styleID),
    part_number: s.partNumber || null,
    brand_name: s.brandName || "",
    title: s.title || null,
    description: s.description || null,
    base_category: s.baseCategory || null,
    style_image: s.styleImage || null,
    brand_image: s.brandImage || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < catalogRows.length; i += 200) {
    const chunk = catalogRows.slice(i, i + 200);
    const { error: upsertErr } = await db
      .from("catalog_styles")
      .upsert(chunk, { onConflict: "style_id" });
    if (upsertErr) console.warn(`[SS Remediate] catalog_styles upsert error:`, upsertErr.message);
  }
  console.log(`[SS Remediate Phase 1] Upserted ${catalogRows.length} catalog_styles`);

  // Build lookup maps
  const styleMap = new Map<string, SSStyle>();
  const partToStyle = new Map<string, string>();
  for (const s of allStyles) {
    const key = s.styleName || String(s.styleID);
    styleMap.set(key, s);
    if (s.partNumber && s.styleName && s.partNumber !== s.styleName) {
      partToStyle.set(s.partNumber, s.styleName);
    }
  }

  // Fetch all ss_activewear master_products
  let allProducts: any[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await db
      .from("master_products")
      .select("id, style_code, source_sku, supplier_item_number, name, base_price, msrp")
      .eq("source", "ss_activewear")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`[SS Remediate Phase 1] Processing ${allProducts.length} master_products`);

  let fixed = 0;
  let alreadyCorrect = 0;
  let notFoundInApi = 0;

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

    if (!ssStyle) {
      notFoundInApi++;
      continue;
    }

    const correctStyleCode = ssStyle.styleName || String(ssStyle.styleID);
    const correctName = ssStyle.title || ssStyle.styleName;
    const correctImage = resolveImage(ssStyle.styleImage);

    const needsUpdate =
      product.style_code !== correctStyleCode ||
      product.source_sku !== correctStyleCode ||
      (correctName && product.name !== correctName);

    if (!needsUpdate) {
      alreadyCorrect++;
      continue;
    }

    const { error } = await db.from("master_products").update({
      style_code: correctStyleCode,
      source_sku: correctStyleCode,
      supplier_item_number: ssStyle.partNumber || product.supplier_item_number,
      name: correctName || product.name,
      image_url: correctImage || undefined,
    }).eq("id", product.id);
    
    if (!error) fixed++;
    else console.warn(`[SS Remediate] Update conflict for ${product.id}: ${error.message}`);
  }

  const report = {
    phase: 1,
    totalApiStyles: allStyles.length,
    totalMasterProducts: allProducts.length,
    catalogStylesUpserted: catalogRows.length,
    fixed,
    alreadyCorrect,
    notFoundInApi,
  };

  console.log("[SS Remediate Phase 1] Report:", JSON.stringify(report));

  return new Response(JSON.stringify({ success: true, report }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Phase 2: Batch-process pricing + color images.
 * Uses catalog_styles for reliable styleID-based API lookups.
 */
async function runPhase2(db: any, basicAuth: string, offset: number, limit: number, force: boolean) {
  console.log(`[SS Remediate Phase 2] offset=${offset}, limit=${limit}, force=${force}`);

  let query = db
    .from("master_products")
    .select("id, style_code, source_sku, supplier_item_number, pricing_override")
    .eq("source", "ss_activewear")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (!force) {
    query = query.or("pricing_synced_at.is.null,images_synced_at.is.null");
  }

  const { data: products, error: queryErr } = await query;
  if (queryErr) throw queryErr;

  console.log(`[SS Remediate Phase 2] Processing ${products?.length || 0} products`);

  if (!products || products.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      report: { phase: 2, processed: 0, pricingUpdated: 0, colorsImported: 0, message: "No products to process" },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Build styleID lookup from catalog_styles for this batch
  const styleCodes = products.map((p: any) => p.style_code || p.source_sku).filter(Boolean);
  const supplierItems = products.map((p: any) => p.supplier_item_number).filter(Boolean);

  const orParts: string[] = [];
  for (const s of styleCodes) orParts.push(`style_name.eq.${s}`);
  for (const s of supplierItems) orParts.push(`part_number.eq.${s}`);

  const { data: catalogRows } = orParts.length > 0
    ? await db.from("catalog_styles").select("style_id, style_name, part_number").or(orParts.join(","))
    : { data: [] };

  const styleIdMap = new Map<string, number>();
  for (const row of catalogRows || []) {
    if (row.style_name) styleIdMap.set(row.style_name, row.style_id);
    if (row.part_number) styleIdMap.set(row.part_number, row.style_id);
  }

  let pricingUpdated = 0;
  let colorsImported = 0;
  let errors = 0;

  for (const product of products) {
    const styleCode = product.style_code || product.source_sku;
    if (!styleCode) continue;

    try {
      let ssProducts: SSProduct[] = [];
      let remaining = 100;

      const apiUrl = `${SS_BASE}/products?style=${encodeURIComponent(styleCode)}`;
      const resp = await fetch(apiUrl, {
        headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
      });
      remaining = parseInt(resp.headers.get("X-Rate-Limit-Remaining") || "100", 10);
      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          ssProducts = Array.isArray(data) ? data : [];
        } catch {
          console.warn(`[SS Remediate P2] Invalid JSON for ${styleCode}: ${text.substring(0, 200)}`);
        }
      } else {
        const errText = await resp.text();
        if (resp.status !== 404) {
          console.warn(`[SS Remediate P2] API ${resp.status} for ${styleCode}: ${errText.substring(0, 200)}`);
        }
      }

      if (ssProducts.length === 0) {
        if (remaining < 3) await new Promise((r) => setTimeout(r, 15000));
        continue;
      }

      // ── Pricing ──
      if (!product.pricing_override) {
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
          master_product_id: product.id,
          size_name: sizeName,
          piece_price: info.piece || null,
          dozen_price: info.dozen || null,
          case_price: info.case_ || null,
          is_upcharge: info.isUpcharge,
        }));
        if (sizeRows.length > 0) {
          await db.from("product_size_pricing").upsert(sizeRows, { onConflict: "master_product_id,size_name" });
        }
        pricingUpdated++;
      }

      // ── Color images ──
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
        for (let i = 0; i < imageRows.length; i += 50) {
          await db.from("product_color_images").upsert(
            imageRows.slice(i, i + 50),
            { onConflict: "master_product_id,color_name" }
          );
        }
        colorsImported += imageRows.length;
      }

      await db.from("master_products").update({
        images_synced_at: new Date().toISOString(),
      }).eq("id", product.id);

      // Rate limiting
      if (remaining < 5) {
        await new Promise((r) => setTimeout(r, 12000));
      } else if (remaining < 20) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`[SS Remediate P2] Error for ${styleCode}:`, err);
      errors++;
    }
  }

  const report = {
    phase: 2,
    processed: products.length,
    pricingUpdated,
    colorsImported,
    errors,
    nextOffset: offset + limit,
  };

  console.log("[SS Remediate Phase 2] Report:", JSON.stringify(report));

  return new Response(JSON.stringify({ success: true, report }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
