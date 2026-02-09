/**
 * Centralized product image utilities for team store products.
 *
 * Precedence rules (flat-first — no model/person):
 *   hero   = best flat/mockup image from primary/extras/catalog
 *   gallery = [primary_image_url?, ...extra_image_urls?, ...catalog images?]
 *
 * All URLs get a cache-busting `?v=<updated_at>` suffix when an updatedAt
 * timestamp is provided, so re-uploaded images at the same path are never stale.
 */

export type ImageType = "lifestyle" | "flat" | "mockup";

/* ─── Cache-busting ─── */

export function bustCache(url: string | null | undefined, updatedAt?: string | null): string {
  if (!url) return "";
  if (!updatedAt) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${new Date(updatedAt).getTime()}`;
}

/* ─── Hero image (single best image, preferring flat/mockup — no model) ─── */

export interface ProductImageSource {
  primary_image_url?: string | null;
  primary_image_type?: ImageType | string | null;
  extra_image_urls?: unknown;
  extra_image_types?: (ImageType | string)[] | null;
  catalog_styles?: { style_image?: string | null } | null;
  updated_at?: string | null;
}

/**
 * Returns the best single display image for a product, preferring flat/mockup
 * images over lifestyle (no model/person).
 *
 * Priority:
 *   1. primary_image_url if flat/mockup
 *   2. first extra_image_url that is flat/mockup
 *   3. catalog_styles.style_image (always flat)
 *   4. primary_image_url (any type — lifestyle as last resort)
 *   5. first extra_image_url (any type)
 */
export function getProductImage(product: ProductImageSource): string {
  const ts = product.updated_at;
  const primaryUrl = product.primary_image_url;
  const primaryType = (product.primary_image_type as ImageType) || "lifestyle";

  const extras = Array.isArray(product.extra_image_urls) ? product.extra_image_urls : [];
  const extraTypes = Array.isArray(product.extra_image_types) ? product.extra_image_types : [];

  // 1. primary if flat/mockup
  if (primaryUrl && (primaryType === "flat" || primaryType === "mockup")) {
    return bustCache(primaryUrl, ts);
  }

  // 2. first flat/mockup extra
  for (let i = 0; i < extras.length; i++) {
    const url = extras[i];
    const type = (extraTypes[i] as ImageType) || "lifestyle";
    if (typeof url === "string" && url && (type === "flat" || type === "mockup")) {
      return bustCache(url, ts);
    }
  }

  // 3. catalog flat image
  const catalogUrl = product.catalog_styles?.style_image;
  if (catalogUrl) {
    return bustCache(catalogUrl, ts);
  }

  // 4. primary (any type — lifestyle as last resort)
  if (primaryUrl) {
    return bustCache(primaryUrl, ts);
  }

  // 5. first extra (any type)
  for (const url of extras) {
    if (typeof url === "string" && url) {
      return bustCache(url, ts);
    }
  }

  return "";
}

/* ─── Gallery (ordered list of all available images) ─── */

/**
 * Returns a de-duplicated, ordered gallery:
 *   1. primary_image_url  (if set)
 *   2. extra_image_urls   (if set)
 *   3. catalog style_image (if not already included)
 *   4. Any SS Activewear color images passed in `ssImages`
 *
 * Lifestyle images are sorted first within each group.
 */
export function getProductGallery(
  product: ProductImageSource,
  ssImages: string[] = [],
): string[] {
  const seen = new Set<string>();
  const lifestyle: string[] = [];
  const other: string[] = [];
  const ts = product.updated_at;

  const primaryType = (product.primary_image_type as ImageType) || "lifestyle";
  const extraTypes = Array.isArray(product.extra_image_types) ? product.extra_image_types : [];

  const push = (url: string | null | undefined, type: ImageType = "lifestyle") => {
    if (!url) return;
    if (seen.has(url)) return;
    seen.add(url);
    const busted = bustCache(url, ts);
    if (type === "lifestyle") {
      lifestyle.push(busted);
    } else {
      other.push(busted);
    }
  };

  push(product.primary_image_url, primaryType);

  const extras = Array.isArray(product.extra_image_urls) ? product.extra_image_urls : [];
  for (let i = 0; i < extras.length; i++) {
    const u = extras[i];
    const t = (extraTypes[i] as ImageType) || "lifestyle";
    if (typeof u === "string") push(u, t);
  }

  // Catalog image treated as flat (apparel-only) by default
  push(product.catalog_styles?.style_image, "flat");

  // SS images treated as lifestyle
  for (const u of ssImages) push(u, "lifestyle");

  return [...lifestyle, ...other];
}

/* ─── onError handler with logging ─── */

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  console.warn(`[ProductImage] Failed to load: ${img.src}`);
  // Set a transparent 1×1 gif so the broken-image icon doesn't show
  img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  img.alt = "";
}
