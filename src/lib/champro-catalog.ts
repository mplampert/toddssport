import { supabase } from "@/integrations/supabase/client";

// All 26 Champro Custom Builder categories with metadata
export const CHAMPRO_CATEGORIES = {
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
} as const;

export type ChamproCategorySlug = keyof typeof CHAMPRO_CATEGORIES;

export interface CategorySyncResult {
  slug: string;
  categoryId: number;
  categoryName: string;
  status: "success" | "partial" | "error" | "no_data";
  productsFound: number;
  error?: string;
}

export interface CatalogSyncSummary {
  totalCategories: number;
  successCategories: number;
  partialCategories: number;
  errorCategories: number;
  noDataCategories: number;
  totalProductsFound: number;
  productsUpserted: number;
  upsertErrors?: string[];
}

export interface CatalogSyncResponse {
  success: boolean;
  summary: CatalogSyncSummary;
  categories: CategorySyncResult[];
  error?: string;
}

/**
 * Trigger a full catalog sync across all Champro categories
 */
export async function syncChamproCatalog(category?: ChamproCategorySlug): Promise<CatalogSyncResponse> {
  const queryParams = category ? `?category=${category}` : "";
  
  const { data, error } = await supabase.functions.invoke(
    `champro-catalog-sync${queryParams}`,
    { method: "POST" }
  );

  if (error) {
    console.error("Catalog sync error:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get all synced products from the database
 */
export async function getChamproProducts(filters?: {
  sport?: string;
  category?: string;
}) {
  let query = supabase
    .from("champro_products")
    .select("*")
    .order("sport")
    .order("category")
    .order("name");

  if (filters?.sport) {
    query = query.eq("sport", filters.sport);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Champro products:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get category info by slug
 */
export function getCategoryInfo(slug: string) {
  return CHAMPRO_CATEGORIES[slug as ChamproCategorySlug] ?? null;
}

/**
 * Get all category slugs
 */
export function getAllCategorySlugs(): ChamproCategorySlug[] {
  return Object.keys(CHAMPRO_CATEGORIES) as ChamproCategorySlug[];
}

/**
 * Get categories grouped by sport
 */
export function getCategoriesBySport(): Record<string, Array<{ slug: ChamproCategorySlug; name: string }>> {
  const grouped: Record<string, Array<{ slug: ChamproCategorySlug; name: string }>> = {};
  
  for (const [slug, info] of Object.entries(CHAMPRO_CATEGORIES)) {
    if (!grouped[info.sport]) {
      grouped[info.sport] = [];
    }
    grouped[info.sport].push({ 
      slug: slug as ChamproCategorySlug, 
      name: info.name 
    });
  }
  
  return grouped;
}
