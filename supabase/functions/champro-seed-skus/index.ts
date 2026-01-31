import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Champro ProductMaster to category mapping
const PRODUCT_MASTERS: Record<string, { sport: string; category: string; name: string }> = {
  // Baseball
  "JSBJ8": { sport: "baseball", category: "JERSEYS", name: "Baseball Jersey" },
  "JSBJ9": { sport: "baseball", category: "JERSEYS", name: "Baseball Jersey V-Neck" },
  "JSBP1": { sport: "baseball", category: "PANTS", name: "Baseball Pants" },
  "JSBT1": { sport: "baseball", category: "TSHIRTS", name: "Baseball T-Shirt" },
  // Softball
  "JSSJ1": { sport: "softball", category: "JERSEYS", name: "Softball Jersey" },
  "JSSP1": { sport: "softball", category: "PANTS", name: "Softball Pants" },
  // Basketball
  "JBBJ1": { sport: "basketball", category: "JERSEYS", name: "Basketball Jersey" },
  "JBBS1": { sport: "basketball", category: "SHORTS", name: "Basketball Shorts" },
  // Football
  "JFBJ1": { sport: "football", category: "JERSEYS", name: "Football Jersey" },
  "JFBP1": { sport: "football", category: "PANTS", name: "Football Pants" },
  // Soccer
  "JSCJ1": { sport: "soccer", category: "JERSEYS", name: "Soccer Jersey" },
  "JSCS1": { sport: "soccer", category: "SHORTS", name: "Soccer Shorts" },
  // Volleyball
  "JVBJ1": { sport: "volleyball", category: "JERSEYS", name: "Volleyball Jersey" },
  "JVBS1": { sport: "volleyball", category: "SHORTS", name: "Volleyball Shorts" },
  // Hockey
  "JHKJ1": { sport: "hockey", category: "JERSEYS", name: "Hockey Jersey" },
  // Lacrosse
  "JLXJ1": { sport: "lacrosse", category: "JERSEYS", name: "Lacrosse Jersey" },
  "JLXS1": { sport: "lacrosse", category: "SHORTS", name: "Lacrosse Shorts" },
};

interface ChamproProductInfoResponse {
  ProductMaster: string;
  MOQCustom: number;
  Configurations?: Array<{
    SKU: string;
    Configuration: string;
    Sizes: Array<{
      Size: string;
      SKU: string;
    }>;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const champroApiKey = Deno.env.get("CHAMPRO_API_KEY");
    if (!champroApiKey) {
      return new Response(JSON.stringify({ error: "Champro API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for optional filters
    let requestBody: { productMasters?: string[] } = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body is fine, we'll seed all
    }

    const productMastersToSeed = requestBody.productMasters || Object.keys(PRODUCT_MASTERS);
    
    const results: Array<{ productMaster: string; skusInserted: number; error?: string }> = [];

    for (const productMaster of productMastersToSeed) {
      const config = PRODUCT_MASTERS[productMaster];
      if (!config) {
        results.push({ productMaster, skusInserted: 0, error: "Unknown ProductMaster" });
        continue;
      }

      try {
        // Call Champro ProductInfo API
        const productInfoUrl = `https://api.champrosports.com/v1/juice/ProductInfo?ProductMaster=${productMaster}`;
        
        console.log(`Fetching ProductInfo for ${productMaster}...`);
        
        const response = await fetch(productInfoUrl, {
          headers: {
            "Authorization": `Bearer ${champroApiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Champro API error for ${productMaster}:`, errorText);
          results.push({ productMaster, skusInserted: 0, error: `API error: ${response.status}` });
          continue;
        }

        const productInfo: ChamproProductInfoResponse = await response.json();
        
        const moqCustom = productInfo.MOQCustom || 12;
        let skusInserted = 0;

        // If no configurations, just insert the base product
        if (!productInfo.Configurations || productInfo.Configurations.length === 0) {
          const { error: upsertError } = await supabaseClient
            .from("champro_products")
            .upsert({
              product_master: productMaster,
              sku: productMaster,
              name: config.name,
              sport: config.sport,
              category: config.category,
              moq_custom: moqCustom,
            }, { onConflict: "sku" });

          if (!upsertError) skusInserted++;
        } else {
          // Insert each configuration SKU
          for (const configItem of productInfo.Configurations) {
            // Insert the main configuration SKU
            const skuData = {
              product_master: productMaster,
              sku: configItem.SKU,
              name: `${config.name} - ${configItem.Configuration}`,
              sport: config.sport,
              category: config.category,
              moq_custom: moqCustom,
            };

            const { error: upsertError } = await supabaseClient
              .from("champro_products")
              .upsert(skuData, { onConflict: "sku" });

            if (!upsertError) {
              skusInserted++;
            } else {
              console.error(`Error upserting SKU ${configItem.SKU}:`, upsertError);
            }

            // Optionally insert size-specific SKUs
            if (configItem.Sizes) {
              for (const size of configItem.Sizes) {
                const sizeSku = {
                  product_master: productMaster,
                  sku: size.SKU,
                  name: `${config.name} - ${configItem.Configuration} - ${size.Size}`,
                  sport: config.sport,
                  category: config.category,
                  moq_custom: moqCustom,
                };

                const { error: sizeError } = await supabaseClient
                  .from("champro_products")
                  .upsert(sizeSku, { onConflict: "sku" });

                if (!sizeError) skusInserted++;
              }
            }
          }
        }

        results.push({ productMaster, skusInserted });
        console.log(`Seeded ${skusInserted} SKUs for ${productMaster}`);

      } catch (err) {
        console.error(`Error processing ${productMaster}:`, err);
        results.push({ productMaster, skusInserted: 0, error: String(err) });
      }
    }

    const totalSkus = results.reduce((sum, r) => sum + r.skusInserted, 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seeded ${totalSkus} SKUs across ${results.length} ProductMasters`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error("Seed SKUs error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
