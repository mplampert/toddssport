import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";
import { getProductImage, handleImageError } from "@/lib/productImages";
import { matchLogosForVariant, type LogoAssignment } from "@/lib/logoMatching";
import { useStoreVariantImages, getBestImageForColor } from "@/hooks/useVariantImages";

interface RawLogoAssignment extends LogoAssignment {
  team_store_item_id: string;
}

interface StorefrontProduct {
  id: string;
  sort_order: number;
  price_override: number | null;
  active: boolean;
  category_id: string | null;
  store_category_override_id: string | null;
  display_name: string | null;
  display_color: string | null;
  primary_image_url: string | null;
  primary_image_type: string | null;
  extra_image_urls: string[] | null;
  extra_image_types: string[] | null;
  allowed_colors?: any;
  catalog_styles: {
    id: number;
    style_id: number;
    style_name: string;
    brand_name: string;
    style_image: string | null;
    description: string | null;
  } | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  sort_order: number;
}

interface Props {
  storeId: string;
  slug: string;
  products: StorefrontProduct[];
  /** If provided, appended to product URLs (e.g. for preview token) */
  urlSuffix?: string;
  /** Base path for product links. Defaults to /team-stores/:slug */
  basePath?: string;
}

export function StorefrontProductGrid({ storeId, slug, products, urlSuffix = "", basePath }: Props) {
  const base = basePath ?? `/team-stores/${slug}`;

  // Fetch logo assignments for all products in this store
  const productIds = products.map((p) => p.id);
  const { data: logoAssignments = [] } = useQuery({
    queryKey: ["storefront-product-logos", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_item_logos")
        .select("id, team_store_item_id, x, y, scale, is_primary, position, variant_color, variant_size, store_logo_id, store_logo_variant_id, store_logos(name, file_url), store_logo_variants(file_url)")
        .in("team_store_item_id", productIds);
      if (error) throw error;
      return data as (RawLogoAssignment & { store_logo_variants?: { file_url: string } | null })[];
    },
    enabled: productIds.length > 0,
  });

  // Fetch variant images for all products
  const { data: allVariantImages = [] } = useStoreVariantImages(productIds);

  // Build lookup: productId -> variant images
  const variantImagesByProduct = useMemo(() => {
    const map = new Map<string, typeof allVariantImages>();
    for (const img of allVariantImages) {
      const arr = map.get(img.team_store_product_id) || [];
      arr.push(img);
      map.set(img.team_store_product_id, arr);
    }
    return map;
  }, [allVariantImages]);

  // Group logos by product id
  const logosByProduct = useMemo(() => {
    const map = new Map<string, LogoAssignment[]>();
    for (const la of logoAssignments) {
      const arr = map.get(la.team_store_item_id) || [];
      arr.push(la);
      map.set(la.team_store_item_id, arr);
    }
    return map;
  }, [logoAssignments]);

  // Fetch global categories
  const { data: globalCategories = [] } = useQuery({
    queryKey: ["team-store-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_categories")
        .select("id, name, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as CategoryInfo[];
    },
  });

  // Fetch store-specific category overrides
  const { data: overrides = [] } = useQuery({
    queryKey: ["store-category-overrides", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_category_overrides")
        .select("id, category_id, display_name, is_hidden, is_custom, sort_order")
        .eq("team_store_id", storeId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Build effective categories and group products
  const { sections } = useMemo(() => {
    // Build category lookup: id -> { name, sortOrder }
    const catMap = new Map<string, { name: string; sortOrder: number }>();
    const hiddenIds = new Set<string>();

    // Start with globals
    for (const gc of globalCategories) {
      catMap.set(gc.id, { name: gc.name, sortOrder: gc.sort_order });
    }

    // Apply overrides
    for (const ov of overrides) {
      if (ov.is_hidden) {
        if (ov.category_id) hiddenIds.add(ov.category_id);
        hiddenIds.add(ov.id);
        continue;
      }
      if (ov.is_custom) {
        catMap.set(ov.id, { name: ov.display_name || "Other", sortOrder: ov.sort_order });
      } else if (ov.category_id) {
        // Override display name / sort order for global category
        const existing = catMap.get(ov.category_id);
        catMap.set(ov.category_id, {
          name: ov.display_name || existing?.name || "Other",
          sortOrder: ov.sort_order ?? existing?.sortOrder ?? 0,
        });
        // Also map override id -> same category for lookups
        catMap.set(ov.id, {
          name: ov.display_name || existing?.name || "Other",
          sortOrder: ov.sort_order ?? existing?.sortOrder ?? 0,
        });
      }
    }

    // Group products by category
    const grouped = new Map<string, StorefrontProduct[]>();
    const uncategorized: StorefrontProduct[] = [];

    for (const p of products) {
      const catId = p.store_category_override_id || p.category_id;
      if (!catId || hiddenIds.has(catId)) {
        uncategorized.push(p);
      } else {
        const arr = grouped.get(catId) || [];
        arr.push(p);
        grouped.set(catId, arr);
      }
    }

    // Build sections: only categories that have products
    const sectionList: { id: string; name: string; sortOrder: number; items: StorefrontProduct[] }[] = [];

    for (const [catId, items] of grouped) {
      const cat = catMap.get(catId);
      if (cat && items.length > 0) {
        sectionList.push({ id: catId, name: cat.name, sortOrder: cat.sortOrder, items });
      } else if (items.length > 0) {
        // Category not found in map — add to uncategorized
        uncategorized.push(...items);
      }
    }

    sectionList.sort((a, b) => a.sortOrder - b.sortOrder);

    // Add uncategorized at the end if there are items
    if (uncategorized.length > 0) {
      // If all products are uncategorized and there are no category sections, don't add a header
      if (sectionList.length === 0) {
        sectionList.push({ id: "all", name: "", sortOrder: 999, items: uncategorized });
      } else {
        sectionList.push({ id: "uncategorized", name: "Other", sortOrder: 999, items: uncategorized });
      }
    }

    return { sections: sectionList };
  }, [products, globalCategories, overrides]);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No products have been added to this store yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <div key={section.id}>
          {section.name && (
            <h2 className="text-2xl font-bold text-foreground mb-4">{section.name}</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {section.items.map((item) => {
              const style = item.catalog_styles;
              const productUrl = `${base}/product/${item.id}${urlSuffix}`;
              // Use variant image for first enabled color if available
              const productVariantImgs = variantImagesByProduct.get(item.id) || [];
              let firstColorImg: string | null = null;
              if (productVariantImgs.length > 0) {
                // Determine the first enabled color
                const allowedColors = Array.isArray(item.allowed_colors) ? item.allowed_colors : [];
                const firstColorName = allowedColors.length > 0 ? allowedColors[0]?.name : null;
                if (firstColorName) {
                  // Find the primary for that color, or first image for that color
                  const colorImgs = productVariantImgs.filter((v) => v.color === firstColorName);
                  firstColorImg = (colorImgs.find((v) => v.is_primary) || colorImgs[0])?.image_url ?? null;
                }
                // If no match for first color, use any primary
                if (!firstColorImg) {
                  firstColorImg = (productVariantImgs.find((v) => v.is_primary) || productVariantImgs[0])?.image_url ?? null;
                }
              }
              const imgSrc = firstColorImg || getProductImage(item);
              const name = item.display_name || style?.style_name || "Product";
              const itemLogos = logosByProduct.get(item.id) || [];
              return (
                <Link key={item.id} to={productUrl}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    {imgSrc && (
                      <div className="relative aspect-square bg-muted flex items-center justify-center p-4">
                        <img src={imgSrc} alt={name} className="max-h-full max-w-full object-contain" onError={handleImageError} />
                        {/* Primary logo overlay only */}
                        {(() => {
                          // Use variant-aware matching (grid shows global/primary only)
                          const matched = matchLogosForVariant(itemLogos);
                          const primaryLogo = matched.find((l) => l.is_primary) || matched[0];
                          if (!primaryLogo) return null;
                          // Prefer variant file_url over master logo file_url
                          const logoUrl = (primaryLogo as any).store_logo_variants?.file_url || primaryLogo.store_logos?.file_url;
                          if (!logoUrl) return null;
                          return (
                            <img
                              src={logoUrl}
                              alt=""
                              className="absolute pointer-events-none object-contain"
                              style={{
                                left: `${(primaryLogo.x ?? 0.5) * 100}%`,
                                top: `${(primaryLogo.y ?? 0.2) * 100}%`,
                                width: `${(primaryLogo.scale ?? 0.3) * 100}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          );
                        })()}
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground">{name}</h3>
                      <p className="text-sm text-muted-foreground">{style?.brand_name}</p>
                      {item.display_color && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.display_color}</p>
                      )}
                      {item.price_override != null && (
                        <p className="text-sm font-semibold text-foreground mt-2">${Number(item.price_override).toFixed(2)}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
