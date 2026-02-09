import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/ss-activewear";
import { getDefaultColor } from "@/lib/storefrontHero";

interface ProductInfo {
  id: string;
  catalog_styles?: { style_id?: number } | null;
  allowed_colors?: unknown;
}

/**
 * Batch-fetch the flat (no-model) colorFrontImage from S&S Activewear
 * for every product in a store. Returns a Map<productId, flatImageUrl>.
 *
 * One API call per unique style ID, results cached by React Query.
 */
export function useStoreFlatImages(products: ProductInfo[]) {
  // Collect unique style IDs
  const styleMap = new Map<number, ProductInfo[]>();
  for (const p of products) {
    const sid = p.catalog_styles?.style_id;
    if (!sid) continue;
    const arr = styleMap.get(sid) || [];
    arr.push(p);
    styleMap.set(sid, arr);
  }
  const styleIds = Array.from(styleMap.keys()).sort();

  return useQuery({
    queryKey: ["store-flat-images", styleIds.join(",")],
    queryFn: async () => {
      const result = new Map<string, string>();
      // Fetch all styles in parallel
      const fetches = styleIds.map(async (sid) => {
        try {
          const ssProducts = await getProducts({ style: String(sid) });
          if (!Array.isArray(ssProducts) || ssProducts.length === 0) return;

          // For each store product with this style, find its default color's frontImage
          const storeProducts = styleMap.get(sid) || [];
          for (const sp of storeProducts) {
            const defaultColorName = getDefaultColor(sp.allowed_colors);
            // Find an SS product matching the default color
            let match = defaultColorName
              ? ssProducts.find((p) => p.colorName === defaultColorName)
              : ssProducts[0];
            if (!match) match = ssProducts[0];

            const frontImage = (match as any).colorFrontImage;
            if (typeof frontImage === "string" && frontImage.length > 0) {
              result.set(sp.id, frontImage);
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch SS flat images for style ${sid}:`, err);
        }
      });
      await Promise.all(fetches);
      return result;
    },
    enabled: styleIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
