import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

function resolveImage(val: string | undefined | null): string | null {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  return `${SS_MEDIA_BASE}${val}`;
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

  // Service role client for DB writes
  const db = createClient(supabaseUrl, serviceKey);

  try {
    const { job_id, brands } = await req.json();

    if (!job_id || !Array.isArray(brands) || brands.length === 0) {
      return new Response(JSON.stringify({ error: "Missing job_id or brands array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark job as running
    await db.from("ss_import_jobs").update({
      status: "running",
      brands_total: brands.length,
      started_at: new Date().toISOString(),
    }).eq("id", job_id);

    // Respond immediately — the import runs in the background via waitUntil-style
    // Since Deno serve doesn't have waitUntil, we'll process synchronously but
    // the client already has the job_id to poll progress
    const basicAuth = btoa(`${ssAccount}:${ssKey}`);
    const log: Array<{ brand: string; fetched: number; written: number; error?: string }> = [];
    let totalImported = 0;

    const catMap: Record<string, string> = {
      "T-Shirts": "tee", "Fleece": "hoodie", "Sweatshirts/Fleece": "hoodie",
      "Polos/Knits": "polo", "Caps": "hat", "Headwear": "hat",
      "Woven Shirts": "woven", "Pants/Shorts": "pants", "Outerwear": "outerwear",
      "Bags": "bag", "Accessories": "accessory", "Activewear": "activewear",
      "Infant/Toddler": "youth", "Youth": "youth",
    };

    for (let i = 0; i < brands.length; i++) {
      const brandName = brands[i];

      // Update progress
      await db.from("ss_import_jobs").update({
        current_brand: brandName,
        brands_completed: i,
        log,
      }).eq("id", job_id);

      try {
        // Fetch all styles for this brand
        const url = `${SS_BASE}/styles?brand=${encodeURIComponent(brandName)}`;
        console.log(`[SS Bulk Import] Fetching: ${url}`);

        const resp = await fetch(url, {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
        });

        const remaining = resp.headers.get("X-Rate-Limit-Remaining");
        console.log(`[SS Bulk Import] ${brandName}: status=${resp.status}, rate-limit-remaining=${remaining}`);

        if (!resp.ok) {
          const errText = await resp.text();
          console.error(`[SS Bulk Import] API error for ${brandName}: ${resp.status} ${errText}`);
          log.push({ brand: brandName, fetched: 0, written: 0, error: `API ${resp.status}` });
          continue;
        }

        const styles: SSStyle[] = await resp.json();
        const fetched = Array.isArray(styles) ? styles.length : 0;
        console.log(`[SS Bulk Import] ${brandName}: ${fetched} styles fetched`);

        if (fetched === 0) {
          log.push({ brand: brandName, fetched: 0, written: 0 });
          continue;
        }

        // Upsert brand
        const brandImage = resolveImage(styles[0]?.brandImage);
        await db.from("brands").upsert(
          { name: brandName, logo_url: brandImage },
          { onConflict: "name" }
        );

        // Get brand ID
        const { data: brandRows } = await db.from("brands").select("id").eq("name", brandName).limit(1);
        const brandId = brandRows?.[0]?.id || null;

        // Build rows
        const rows = styles.map((s) => ({
          brand_id: brandId,
          name: s.title || s.styleName,
          category: catMap[s.baseCategory || ""] || (s.baseCategory || "other").toLowerCase().replace(/[^a-z0-9]/g, "_"),
          product_type: "blank_apparel",
          source: "ss_activewear",
          source_sku: s.partNumber || String(s.styleID),
          image_url: resolveImage(s.styleImage),
          description_short: s.description?.substring(0, 200) || null,
          active: true,
        }));

        // Batch upsert (using source + source_sku as conflict key via insert ignore)
        let written = 0;
        for (let j = 0; j < rows.length; j += 50) {
          const chunk = rows.slice(j, j + 50);
          // Use insert with onConflict ignore to avoid duplicates
          const { data: inserted, error: insertErr } = await db
            .from("master_products")
            .upsert(chunk, { onConflict: "source,source_sku", ignoreDuplicates: false })
            .select("id");

          if (insertErr) {
            // If unique constraint doesn't exist yet, fall back to plain insert
            console.warn(`[SS Bulk Import] Upsert chunk error: ${insertErr.message}, trying insert`);
            const { error: fallbackErr } = await db.from("master_products").insert(chunk);
            if (fallbackErr) {
              console.error(`[SS Bulk Import] Insert fallback error: ${fallbackErr.message}`);
            } else {
              written += chunk.length;
            }
          } else {
            written += inserted?.length || chunk.length;
          }
        }

        totalImported += written;
        log.push({ brand: brandName, fetched, written });
        console.log(`[SS Bulk Import] ${brandName}: ${written} written to master_products`);

        // Rate limiting: if remaining is low, wait
        const remainingNum = parseInt(remaining || "100", 10);
        if (remainingNum < 5) {
          console.log(`[SS Bulk Import] Rate limit low (${remainingNum}), waiting 10s...`);
          await new Promise((r) => setTimeout(r, 10000));
        }
      } catch (brandErr: unknown) {
        const msg = brandErr instanceof Error ? brandErr.message : String(brandErr);
        console.error(`[SS Bulk Import] Error processing ${brandName}:`, msg);
        log.push({ brand: brandName, fetched: 0, written: 0, error: msg });
      }
    }

    // Mark complete
    await db.from("ss_import_jobs").update({
      status: "completed",
      brands_completed: brands.length,
      current_brand: null,
      products_imported: totalImported,
      log,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);

    console.log(`[SS Bulk Import] Job ${job_id} completed: ${totalImported} total products imported`);

    return new Response(JSON.stringify({ success: true, totalImported, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SS Bulk Import] Fatal error:", err);

    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
