import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.ssactivewear.com/v2";
const SS_MEDIA_BASE = "https://www.ssactivewear.com/";

function resolveImage(val: string | undefined | null): string | null {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  return `${SS_MEDIA_BASE}${val}`;
}

/**
 * One-time fix: fetches all S&S styles, matches orphaned master_products
 * (brand_id IS NULL, source = 'ss_activewear') by source_sku (partNumber),
 * upserts the brand, and updates master_products.brand_id.
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

  // Auth check
  const authHeader = req.headers.get("authorization") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Get orphaned S&S products
    const { data: orphans, error: orphErr } = await db
      .from("master_products")
      .select("id, source_sku")
      .eq("source", "ss_activewear")
      .is("brand_id", null);

    if (orphErr) throw orphErr;
    if (!orphans || orphans.length === 0) {
      return new Response(JSON.stringify({ message: "No orphaned S&S products found", fixed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Fix Brands] Found ${orphans.length} orphaned S&S products`);

    // 2. Build a lookup set of orphan SKUs
    const orphanSkuMap = new Map<string, string[]>(); // sku -> [product ids]
    for (const o of orphans) {
      if (!o.source_sku) continue;
      const ids = orphanSkuMap.get(o.source_sku) || [];
      ids.push(o.id);
      orphanSkuMap.set(o.source_sku, ids);
    }

    // 3. Fetch all S&S styles
    const basicAuth = btoa(`${ssAccount}:${ssKey}`);
    const resp = await fetch(`${SS_BASE}/styles`, {
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`S&S API error: ${resp.status} ${errText}`);
    }

    const styles: Array<{
      styleID: number;
      partNumber?: string;
      brandName: string;
      brandImage?: string;
    }> = await resp.json();

    console.log(`[Fix Brands] Fetched ${styles.length} S&S styles`);

    // 4. Map brand names to brand IDs, creating brands as needed
    const brandUpdates = new Map<string, { brandImage: string | null; productIds: string[] }>();

    for (const style of styles) {
      const sku = style.partNumber || String(style.styleID);
      const ids = orphanSkuMap.get(sku);
      if (!ids) continue;

      const brandName = style.brandName;
      if (!brandName) continue;

      const existing = brandUpdates.get(brandName);
      if (existing) {
        existing.productIds.push(...ids);
      } else {
        brandUpdates.set(brandName, {
          brandImage: resolveImage(style.brandImage),
          productIds: [...ids],
        });
      }
    }

    console.log(`[Fix Brands] Matched ${brandUpdates.size} brands for orphaned products`);

    let totalFixed = 0;

    for (const [brandName, info] of brandUpdates) {
      // Upsert brand
      await db.from("brands").upsert(
        { name: brandName, logo_url: info.brandImage },
        { onConflict: "name" }
      );

      // Get brand ID
      const { data: brandRows } = await db.from("brands").select("id").eq("name", brandName).limit(1);
      const brandId = brandRows?.[0]?.id;
      if (!brandId) {
        console.warn(`[Fix Brands] Could not find brand ID for ${brandName}`);
        continue;
      }

      // Update products
      for (let i = 0; i < info.productIds.length; i += 50) {
        const chunk = info.productIds.slice(i, i + 50);
        const { error: updateErr } = await db
          .from("master_products")
          .update({ brand_id: brandId })
          .in("id", chunk);
        if (updateErr) {
          console.error(`[Fix Brands] Update error for ${brandName}:`, updateErr.message);
        } else {
          totalFixed += chunk.length;
        }
      }

      console.log(`[Fix Brands] Fixed ${info.productIds.length} products → ${brandName}`);
    }

    // Check remaining orphans
    const { count } = await db
      .from("master_products")
      .select("id", { count: "exact", head: true })
      .eq("source", "ss_activewear")
      .is("brand_id", null);

    return new Response(JSON.stringify({
      message: `Fixed ${totalFixed} products across ${brandUpdates.size} brands`,
      fixed: totalFixed,
      remaining_orphans: count || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Fix Brands] Error:", err);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
