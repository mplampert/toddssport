import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All 26 Champro Custom Builder categories
const CHAMPRO_CATEGORIES: Record<string, { id: number; name: string; sport: string; category: string }> = {
  // Core Sports
  baseball: { id: 1154, name: "BASEBALL", sport: "baseball", category: "JERSEYS" },
  softball: { id: 1155, name: "FASTPITCH", sport: "softball", category: "JERSEYS" },
  football: { id: 1158, name: "FOOTBALL", sport: "football", category: "JERSEYS" },
  "mens-basketball": { id: 1159, name: "MEN'S BASKETBALL", sport: "basketball", category: "JERSEYS" },
  "womens-basketball": { id: 1160, name: "WOMEN'S BASKETBALL", sport: "basketball", category: "JERSEYS" },
  "mens-volleyball": { id: 1161, name: "MEN'S VOLLEYBALL", sport: "volleyball", category: "JERSEYS" },
  "womens-volleyball": { id: 1162, name: "WOMEN'S VOLLEYBALL", sport: "volleyball", category: "JERSEYS" },
  "mens-soccer": { id: 1164, name: "MEN'S SOCCER", sport: "soccer", category: "JERSEYS" },
  "womens-soccer": { id: 1165, name: "WOMEN'S SOCCER", sport: "soccer", category: "JERSEYS" },
  hockey: { id: 1168, name: "HOCKEY", sport: "hockey", category: "JERSEYS" },
  wrestling: { id: 1172, name: "WRESTLING", sport: "wrestling", category: "JERSEYS" },
  "mens-track": { id: 1248, name: "MEN'S TRACK", sport: "track-field", category: "JERSEYS" },
  "womens-track": { id: 1249, name: "WOMEN'S TRACK", sport: "track-field", category: "JERSEYS" },
  "mens-lacrosse": { id: 1251, name: "MEN'S LACROSSE", sport: "lacrosse", category: "JERSEYS" },
  "womens-lacrosse": { id: 1252, name: "WOMEN'S LACROSSE", sport: "lacrosse", category: "JERSEYS" },
  slowpitch: { id: 1209, name: "SLOWPITCH", sport: "slowpitch", category: "JERSEYS" },
  "7v7": { id: 1171, name: "7V7", sport: "7v7", category: "JERSEYS" },
  
  // Accessories & Apparel
  caps: { id: 1156, name: "CAPS", sport: "accessories", category: "ACCESSORIES" },
  "splash-shirts": { id: 1157, name: "SPLASH SHIRTS", sport: "apparel", category: "TSHIRTS" },
  "mens-sportswear": { id: 1217, name: "MEN'S SPORTSWEAR", sport: "sportswear", category: "OUTERWEAR" },
  "womens-sportswear": { id: 1219, name: "WOMEN'S SPORTSWEAR", sport: "sportswear", category: "OUTERWEAR" },
  
  // Special Programs & Collections
  realtree: { id: 1542, name: "REALTREE®", sport: "specialty", category: "OUTERWEAR" },
  "juice-5-day": { id: 1566, name: "JUICE 5-DAY PROGRAM", sport: "quick-turn", category: "JERSEYS" },
  "legacy-collection": { id: 1567, name: "LEGACY COLLECTION", sport: "specialty", category: "JERSEYS" },
  "slam-dunk-5-day": { id: 1590, name: "SLAM DUNK 5-DAY PROGRAM", sport: "quick-turn", category: "JERSEYS" },
};

// Champro API configuration
const CHAMPRO_BASE_URL = "https://api.champrosports.com";
const CHAMPRO_CB_URL = "https://cb.champrosports.com";

interface CategoryResult {
  slug: string;
  categoryId: number;
  categoryName: string;
  status: "success" | "partial" | "error" | "no_data";
  productsFound: number;
  error?: string;
}

interface NormalizedProduct {
  product_master: string;
  sku: string | null;
  name: string;
  sport: string;
  category: string;
  moq_custom: number;
  default_lead_time_name: string | null;
  type: "category" | "product";
  msrp: number | null;
  has_sizes: boolean;
  parent_category: string | null;
}

/**
 * Fetch product data from Champro API for a specific category
 * Note: Champro's API is order-oriented, so we try multiple endpoints
 */
async function fetchCategoryProducts(
  categorySlug: string,
  categoryInfo: { id: number; name: string; sport: string; category: string },
  apiKey: string
): Promise<{ products: NormalizedProduct[]; status: CategoryResult["status"]; error?: string }> {
  const products: NormalizedProduct[] = [];
  
  try {
    // Try the ProductInfo endpoint with the category
    const productInfoUrl = `${CHAMPRO_BASE_URL}/api/Order/ProductInfo?APICustomerKey=${encodeURIComponent(apiKey)}&CategoryID=${categoryInfo.id}`;
    
    console.log(`[${categorySlug}] Fetching from ProductInfo endpoint...`);
    
    const response = await fetch(productInfoUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[${categorySlug}] ProductInfo failed with status ${response.status}: ${errorText}`);
      
      // Try alternate approach - fetch from Custom Builder catalog endpoint
      return await fetchFromCustomBuilder(categorySlug, categoryInfo);
    }

    const data = await response.json();
    console.log(`[${categorySlug}] ProductInfo response:`, JSON.stringify(data).substring(0, 500));

    // Check for API errors
    if (data.RequestErrors && data.RequestErrors.length > 0) {
      const errorMsg = data.RequestErrors.map((e: { Response: string }) => e.Response).join("; ");
      console.log(`[${categorySlug}] API returned errors: ${errorMsg}`);
      
      // Fall back to Custom Builder approach
      return await fetchFromCustomBuilder(categorySlug, categoryInfo);
    }

    // Parse ProductSKUs if available - these are actual sellable products
    if (data.ProductSKUs && Array.isArray(data.ProductSKUs)) {
      for (const sku of data.ProductSKUs) {
        const hasSku = !!(sku.SKU && sku.SKU.trim());
        const hasPrice = !!(sku.MSRP || sku.Price || sku.Cost);
        const hasSizes = !!(sku.Sizes && sku.Sizes.length > 0);
        
        products.push({
          product_master: sku.ProductMaster || sku.SKU?.split("-")[0] || categorySlug,
          sku: sku.SKU || null,
          name: sku.Description || sku.ProductName || categoryInfo.name,
          sport: categoryInfo.sport,
          category: categoryInfo.category,
          moq_custom: sku.MOQCustom || sku.MinQty || 1,
          default_lead_time_name: sku.LeadTime || "JUICE Standard",
          // Classify as product only if it has SKU, price, and sizes
          type: (hasSku && hasPrice && hasSizes) ? "product" : "category",
          msrp: sku.MSRP || sku.Price || null,
          has_sizes: hasSizes,
          parent_category: categorySlug,
        });
      }
    }

    // Parse Products array if available (alternate response format)
    if (data.Products && Array.isArray(data.Products)) {
      for (const product of data.Products) {
        const hasSku = !!(product.SKU && product.SKU.trim());
        const hasPrice = !!(product.MSRP || product.Price || product.Cost);
        const hasSizes = !!(product.Sizes && product.Sizes.length > 0);
        
        products.push({
          product_master: product.ProductMaster || product.StyleNumber || categorySlug,
          sku: product.SKU || null,
          name: product.Name || product.Description || categoryInfo.name,
          sport: categoryInfo.sport,
          category: categoryInfo.category,
          moq_custom: product.MOQCustom || product.MinimumQuantity || 1,
          default_lead_time_name: product.LeadTimeName || "JUICE Standard",
          type: (hasSku && hasPrice && hasSizes) ? "product" : "category",
          msrp: product.MSRP || product.Price || null,
          has_sizes: hasSizes,
          parent_category: categorySlug,
        });
      }
    }

    if (products.length === 0) {
      console.log(`[${categorySlug}] No products in API response, trying Custom Builder...`);
      return await fetchFromCustomBuilder(categorySlug, categoryInfo);
    }

    return { products, status: "success" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${categorySlug}] Error fetching from API: ${errorMsg}`);
    
    // Try Custom Builder as fallback
    return await fetchFromCustomBuilder(categorySlug, categoryInfo);
  }
}

/**
 * Fallback: Try to extract product info from Custom Builder endpoints
 * This is a best-effort approach since CB is design-oriented, not product-feed oriented
 */
async function fetchFromCustomBuilder(
  categorySlug: string,
  categoryInfo: { id: number; name: string; sport: string; category: string }
): Promise<{ products: NormalizedProduct[]; status: CategoryResult["status"]; error?: string }> {
  const products: NormalizedProduct[] = [];
  
  try {
    // Try the Custom Builder API endpoint for category data
    const cbApiUrl = `${CHAMPRO_CB_URL}/api/Categories/${categoryInfo.id}`;
    
    console.log(`[${categorySlug}] Trying Custom Builder API: ${cbApiUrl}`);
    
    const response = await fetch(cbApiUrl, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.log(`[${categorySlug}] Custom Builder API returned ${response.status}`);
      
      // Create a placeholder CATEGORY entry for this (not a sellable product)
      products.push({
        product_master: `CHAMPRO-${categorySlug.toUpperCase()}`,
        sku: null,
        name: categoryInfo.name,
        sport: categoryInfo.sport,
        category: categoryInfo.category,
        moq_custom: 12, // Default MOQ for custom products
        default_lead_time_name: "JUICE Standard",
        type: "category", // This is a category, not a sellable product
        msrp: null,
        has_sizes: false,
        parent_category: null,
      });
      
      return { products, status: "partial", error: `CB API returned ${response.status}` };
    }

    const data = await response.json();
    console.log(`[${categorySlug}] Custom Builder response:`, JSON.stringify(data).substring(0, 500));

    // Try to extract product/style information from CB response
    if (data.Styles && Array.isArray(data.Styles)) {
      for (const style of data.Styles) {
        const hasSku = !!(style.SKU && style.SKU.trim());
        const hasPrice = !!(style.MSRP || style.Price);
        const hasSizes = !!(style.Sizes && style.Sizes.length > 0);
        
        products.push({
          product_master: style.StyleNumber || style.Code || `${categorySlug}-style`,
          sku: style.SKU || null,
          name: style.Name || style.Description || categoryInfo.name,
          sport: categoryInfo.sport,
          category: categoryInfo.category,
          moq_custom: style.MinQty || 12,
          default_lead_time_name: style.LeadTime || "JUICE Standard",
          type: (hasSku && hasPrice && hasSizes) ? "product" : "category",
          msrp: style.MSRP || style.Price || null,
          has_sizes: hasSizes,
          parent_category: categorySlug,
        });
      }
    }

    if (data.Products && Array.isArray(data.Products)) {
      for (const product of data.Products) {
        const hasSku = !!(product.SKU && product.SKU.trim());
        const hasPrice = !!(product.MSRP || product.Price);
        const hasSizes = !!(product.Sizes && product.Sizes.length > 0);
        
        products.push({
          product_master: product.Code || product.ProductMaster || `${categorySlug}-product`,
          sku: product.SKU || null,
          name: product.Name || categoryInfo.name,
          sport: categoryInfo.sport,
          category: categoryInfo.category,
          moq_custom: product.MinQty || 12,
          default_lead_time_name: "JUICE Standard",
          type: (hasSku && hasPrice && hasSizes) ? "product" : "category",
          msrp: product.MSRP || product.Price || null,
          has_sizes: hasSizes,
          parent_category: categorySlug,
        });
      }
    }

    // If still no products, create placeholder category
    if (products.length === 0) {
      products.push({
        product_master: `CHAMPRO-${categorySlug.toUpperCase()}`,
        sku: null,
        name: categoryInfo.name,
        sport: categoryInfo.sport,
        category: categoryInfo.category,
        moq_custom: 12,
        default_lead_time_name: "JUICE Standard",
        type: "category",
        msrp: null,
        has_sizes: false,
        parent_category: null,
      });
      return { products, status: "partial", error: "No products found in CB response, created placeholder category" };
    }

    return { products, status: "success" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${categorySlug}] Custom Builder fallback error: ${errorMsg}`);
    
    // Create placeholder category even on error
    products.push({
      product_master: `CHAMPRO-${categorySlug.toUpperCase()}`,
      sku: null,
      name: categoryInfo.name,
      sport: categoryInfo.sport,
      category: categoryInfo.category,
      moq_custom: 12,
      default_lead_time_name: "JUICE Standard",
      type: "category",
      msrp: null,
      has_sizes: false,
      parent_category: null,
    });
    
    return { products, status: "error", error: errorMsg };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CHAMPRO_API_KEY = Deno.env.get("CHAMPRO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!CHAMPRO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CHAMPRO_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const specificCategory = url.searchParams.get("category"); // Optional: sync just one category

    const categoriesToSync = specificCategory 
      ? { [specificCategory]: CHAMPRO_CATEGORIES[specificCategory] }
      : CHAMPRO_CATEGORIES;

    if (specificCategory && !CHAMPRO_CATEGORIES[specificCategory]) {
      return new Response(
        JSON.stringify({ error: `Unknown category: ${specificCategory}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting Champro catalog sync for ${Object.keys(categoriesToSync).length} categories...`);

    const results: CategoryResult[] = [];
    const allProducts: NormalizedProduct[] = [];

    // Process each category
    for (const [slug, info] of Object.entries(categoriesToSync)) {
      if (!info) continue;
      
      console.log(`\n=== Processing category: ${slug} (ID: ${info.id}) ===`);
      
      const { products, status, error } = await fetchCategoryProducts(slug, info, CHAMPRO_API_KEY);
      
      results.push({
        slug,
        categoryId: info.id,
        categoryName: info.name,
        status,
        productsFound: products.length,
        error,
      });

      allProducts.push(...products);
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Upsert products to database
    let upsertedCount = 0;
    let upsertErrors: string[] = [];

    if (allProducts.length > 0) {
      console.log(`\nUpserting ${allProducts.length} products to database...`);
      
      // Batch upsert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < allProducts.length; i += chunkSize) {
        const chunk = allProducts.slice(i, i + chunkSize);
        
        const { data, error } = await supabase
          .from("champro_products")
          .upsert(
            chunk.map(p => ({
              product_master: p.product_master,
              sku: p.sku,
              name: p.name,
              sport: p.sport,
              category: p.category,
              moq_custom: p.moq_custom,
              default_lead_time_name: p.default_lead_time_name,
              type: p.type,
              msrp: p.msrp,
              has_sizes: p.has_sizes,
              parent_category: p.parent_category,
            })),
            { onConflict: "product_master", ignoreDuplicates: false }
          )
          .select();

        if (error) {
          console.error(`Upsert error for chunk ${i / chunkSize + 1}: ${error.message}`);
          upsertErrors.push(error.message);
        } else {
          upsertedCount += data?.length || 0;
        }
      }
    }

    // Build summary
    const summary = {
      totalCategories: Object.keys(categoriesToSync).length,
      successCategories: results.filter(r => r.status === "success").length,
      partialCategories: results.filter(r => r.status === "partial").length,
      errorCategories: results.filter(r => r.status === "error").length,
      noDataCategories: results.filter(r => r.status === "no_data").length,
      totalProductsFound: allProducts.length,
      productsUpserted: upsertedCount,
      upsertErrors: upsertErrors.length > 0 ? upsertErrors : undefined,
    };

    // Log detailed results
    console.log("\n=== SYNC SUMMARY ===");
    console.log(JSON.stringify(summary, null, 2));
    console.log("\n=== CATEGORY DETAILS ===");
    for (const result of results) {
      const icon = result.status === "success" ? "✓" : result.status === "partial" ? "⚠" : "✗";
      console.log(`${icon} [${result.slug}] ${result.categoryName}: ${result.productsFound} products (${result.status})${result.error ? ` - ${result.error}` : ""}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        categories: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Catalog sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
