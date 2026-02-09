import { useQuery } from "@tanstack/react-query";
import { getProducts, type SSProduct } from "@/lib/ss-activewear";

interface AllowedColor {
  code: string;
  name: string;
}

interface ProductInfo {
  id: string;
  style_id: number;
  catalog_styles?: { style_id: number; style_image?: string | null } | null;
  allowed_colors?: unknown;
}

/**
 * For a list of store products, fetches SS API data for their styles
 * and resolves the front image for each product's first allowed color.
 *
 * Returns a Map<productId, imageUrl>.
 */
export function useFirstColorImages(products: ProductInfo[]) {
  // Collect unique catalog style_ids (SS API style IDs)
  const styleIdMap = new Map<number, ProductInfo[]>();
  for (const p of products) {
    const ssId = p.catalog_styles?.style_id ?? p.style_id;
    if (!styleIdMap.has(ssId)) styleIdMap.set(ssId, []);
    styleIdMap.get(ssId)!.push(p);
  }
  const uniqueStyleIds = Array.from(styleIdMap.keys());

  return useQuery({
    queryKey: ["ss-first-color-images", uniqueStyleIds.sort().join(",")],
    queryFn: async () => {
      // Fetch SS products for all styles in parallel
      const results = await Promise.allSettled(
        uniqueStyleIds.map((sid) => getProducts({ style: String(sid) }))
      );

      // Build color→frontImage maps per style
      const colorImagesByStyle = new Map<number, Map<string, string>>();
      results.forEach((result, i) => {
        if (result.status !== "fulfilled") return;
        const styleId = uniqueStyleIds[i];
        const map = new Map<string, string>();
        for (const p of result.value as SSProduct[]) {
          if (p.colorCode && p.colorFrontImage && !map.has(p.colorCode)) {
            map.set(p.colorCode, p.colorFrontImage);
          }
        }
        colorImagesByStyle.set(styleId, map);
      });

      // Resolve per-product: first allowed color's front image
      const imageMap = new Map<string, string>();
      for (const product of products) {
        const ssId = product.catalog_styles?.style_id ?? product.style_id;
        const colors = product.allowed_colors;
        if (!Array.isArray(colors) || colors.length === 0) continue;
        const firstColor = colors[0] as AllowedColor;
        const styleColors = colorImagesByStyle.get(ssId);
        if (!styleColors) continue;
        const img = styleColors.get(firstColor.code);
        if (img) {
          // Normalize relative URLs
          const url = img.startsWith("//") ? `https:${img}` : img.startsWith("/") ? `https://www.ssactivewear.com${img}` : img;
          imageMap.set(product.id, url);
        }
      }
      return imageMap;
    },
    staleTime: 1000 * 60 * 10, // cache 10 minutes
    enabled: uniqueStyleIds.length > 0,
  });
}
