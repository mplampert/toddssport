import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VariantImage {
  id: string;
  team_store_product_id: string;
  color: string;
  image_url: string;
  image_type: string;
  is_primary: boolean;
  sort_order: number;
}

/**
 * Fetch all variant images for a product, grouped by color.
 */
export function useProductVariantImages(productId: string | undefined) {
  return useQuery({
    queryKey: ["variant-images", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_product_variant_images")
        .select("*")
        .eq("team_store_product_id", productId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as VariantImage[];
    },
    enabled: !!productId,
  });
}

/**
 * Fetch variant images for all products in a store (for grid tiles).
 */
export function useStoreVariantImages(productIds: string[]) {
  return useQuery({
    queryKey: ["store-variant-images", productIds.sort().join(",")],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("team_store_product_variant_images")
        .select("*")
        .in("team_store_product_id", productIds)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as VariantImage[];
    },
    enabled: productIds.length > 0,
  });
}

/**
 * Group variant images by color for easy lookup.
 */
export function groupByColor(images: VariantImage[]): Map<string, VariantImage[]> {
  const map = new Map<string, VariantImage[]>();
  for (const img of images) {
    const arr = map.get(img.color) || [];
    arr.push(img);
    map.set(img.color, arr);
  }
  return map;
}

/**
 * Get the best image for a specific color, preferring primary then first.
 */
export function getBestImageForColor(
  images: VariantImage[],
  color: string
): string | null {
  const colorImages = images.filter((img) => img.color === color);
  if (colorImages.length === 0) return null;
  const primary = colorImages.find((img) => img.is_primary);
  return primary?.image_url ?? colorImages[0]?.image_url ?? null;
}

/**
 * Get gallery images for a specific color (ordered).
 */
export function getGalleryForColor(
  images: VariantImage[],
  color: string
): string[] {
  return images
    .filter((img) => img.color === color)
    .sort((a, b) => {
      // Primary first, then by sort_order
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.sort_order - b.sort_order;
    })
    .map((img) => img.image_url);
}

export function useDeleteVariantImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("team_store_product_variant_images")
        .delete()
        .eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-images"] });
    },
  });
}

export function useSetPrimaryVariantImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId, productId, color }: { imageId: string; productId: string; color: string }) => {
      // Unset all primaries for this product+color
      const { error: err1 } = await supabase
        .from("team_store_product_variant_images")
        .update({ is_primary: false } as any)
        .eq("team_store_product_id", productId)
        .eq("color", color);
      if (err1) throw err1;
      // Set the new primary
      const { error: err2 } = await supabase
        .from("team_store_product_variant_images")
        .update({ is_primary: true } as any)
        .eq("id", imageId);
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-images"] });
    },
  });
}
