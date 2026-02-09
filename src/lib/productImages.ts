/**
 * Centralized product image utilities for team store products.
 *
 * Precedence rules:
 *   hero   = primary_image_url ?? catalog_styles.style_image
 *   gallery = [primary_image_url?, ...extra_image_urls?, ...catalog images?]
 *
 * All URLs get a cache-busting `?v=<updated_at>` suffix when an updatedAt
 * timestamp is provided, so re-uploaded images at the same path are never stale.
 */

/* ─── Cache-busting ─── */

export function bustCache(url: string | null | undefined, updatedAt?: string | null): string {
  if (!url) return "";
  if (!updatedAt) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${new Date(updatedAt).getTime()}`;
}

/* ─── Hero image (single best image) ─── */

export interface ProductImageSource {
  primary_image_url?: string | null;
  catalog_styles?: { style_image?: string | null } | null;
  updated_at?: string | null;
}

export function getProductImage(product: ProductImageSource): string {
  const raw = product.primary_image_url ?? product.catalog_styles?.style_image ?? "";
  return bustCache(raw, product.updated_at) || "";
}

/* ─── Gallery (ordered list of all available images) ─── */

export interface GallerySource extends ProductImageSource {
  extra_image_urls?: unknown;
}

/**
 * Returns a de-duplicated, ordered gallery:
 *   1. primary_image_url  (if set)
 *   2. extra_image_urls   (if set)
 *   3. catalog style_image (if not already included)
 *   4. Any SS Activewear color images passed in `ssImages`
 */
export function getProductGallery(
  product: GallerySource,
  ssImages: string[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const ts = product.updated_at;

  const push = (url: string | null | undefined) => {
    if (!url) return;
    if (seen.has(url)) return;
    seen.add(url);
    result.push(bustCache(url, ts));
  };

  push(product.primary_image_url);

  const extras = Array.isArray(product.extra_image_urls) ? product.extra_image_urls : [];
  for (const u of extras) {
    if (typeof u === "string") push(u);
  }

  push(product.catalog_styles?.style_image);

  for (const u of ssImages) push(u);

  return result;
}

/* ─── onError handler with logging ─── */

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  console.warn(`[ProductImage] Failed to load: ${img.src}`);
  // Set a transparent 1×1 gif so the broken-image icon doesn't show
  img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  img.alt = "";
}
