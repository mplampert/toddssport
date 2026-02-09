/**
 * Shared hero-image resolver for storefront grid tiles AND product detail pages.
 *
 * Both pages MUST call the same function so the thumbnail on the grid
 * always matches the main image shown when you first open the PDP.
 *
 * Resolution order (flat-first, no model/person images):
 *   1. Variant image for the default color (primary first)
 *   2. Catalog flat image (catalog_styles.style_image)
 *   3. Product override images – flat/mockup first, lifestyle last
 *   4. Empty string (nothing)
 */

import type { VariantImage } from "@/hooks/useVariantImages";

/* ── types ── */

export interface AllowedColor {
  code: string;
  name: string;
  excludedSizes?: string[];
}

export interface StorefrontHeroResult {
  /** The URL of the image to display on both grid tile and PDP initial load */
  heroImageUrl: string;
  /** Classification of the hero image */
  heroImageType: "variant" | "catalog" | "override";
  /** The deterministic default color name (first enabled color, or null) */
  defaultColor: string | null;
}

/* ── resolver ── */

/**
 * Determine the default color for a store product.
 *
 * Rule: first entry in allowed_colors (the admin-ordered list).
 * If allowed_colors is empty / not set, returns null.
 */
export function getDefaultColor(allowedColors: unknown): string | null {
  if (!Array.isArray(allowedColors) || allowedColors.length === 0) return null;
  const first = allowedColors[0] as AllowedColor | undefined;
  return first?.name ?? null;
}

/**
 * Single source of truth for the storefront hero image.
 * Prefers flat/catalog images over lifestyle (no model/person).
 *
 * @param product       The team_store_products row (with catalog_styles join)
 * @param variantImages All variant images for this product
 */
export function getStorefrontHero(
  product: {
    allowed_colors?: unknown;
    primary_image_url?: string | null;
    primary_image_type?: string | null;
    extra_image_urls?: unknown;
    extra_image_types?: (string)[] | null;
    updated_at?: string | null;
    catalog_styles?: { style_image?: string | null } | null;
  },
  variantImages: VariantImage[],
): StorefrontHeroResult {
  const defaultColor = getDefaultColor(product.allowed_colors);

  // 1. Variant image for the default color (prefer flat/mockup over lifestyle)
  if (defaultColor && variantImages.length > 0) {
    const colorImgs = variantImages.filter((v) => v.color === defaultColor);
    if (colorImgs.length > 0) {
      // Prefer flat/mockup, then primary, then first
      const flat = colorImgs.find((v) => v.image_type === "flat" || v.image_type === "mockup");
      const best = flat || colorImgs.find((v) => v.is_primary) || colorImgs[0];
      return {
        heroImageUrl: best.image_url,
        heroImageType: "variant",
        defaultColor,
      };
    }
    // No images for default color — try any flat/primary variant image
    const anyFlat = variantImages.find((v) => v.image_type === "flat" || v.image_type === "mockup");
    const anyPrimary = anyFlat || variantImages.find((v) => v.is_primary) || variantImages[0];
    if (anyPrimary) {
      return {
        heroImageUrl: anyPrimary.image_url,
        heroImageType: "variant",
        defaultColor,
      };
    }
  }

  // 2. Catalog flat image (same image used in admin placement canvas)
  const catalogUrl = product.catalog_styles?.style_image;
  if (catalogUrl) {
    return {
      heroImageUrl: catalogUrl,
      heroImageType: "catalog",
      defaultColor,
    };
  }

  // 3. Product override images — prefer flat/mockup over lifestyle
  const overrideUrl = getProductImageFlatFirst(product);
  if (overrideUrl) {
    return {
      heroImageUrl: overrideUrl,
      heroImageType: "override",
      defaultColor,
    };
  }

  return { heroImageUrl: "", heroImageType: "catalog", defaultColor };
}

/**
 * Returns the best single display image for a product, preferring flat/mockup
 * over lifestyle (no model/person).
 */
function getProductImageFlatFirst(product: {
  primary_image_url?: string | null;
  primary_image_type?: string | null;
  extra_image_urls?: unknown;
  extra_image_types?: (string)[] | null;
  updated_at?: string | null;
  catalog_styles?: { style_image?: string | null } | null;
}): string {
  const primaryUrl = product.primary_image_url;
  const primaryType = product.primary_image_type || "lifestyle";
  const extras = Array.isArray(product.extra_image_urls) ? product.extra_image_urls : [];
  const extraTypes = Array.isArray(product.extra_image_types) ? product.extra_image_types : [];

  // 1. primary if flat/mockup
  if (primaryUrl && (primaryType === "flat" || primaryType === "mockup")) return primaryUrl;

  // 2. first flat/mockup extra
  for (let i = 0; i < extras.length; i++) {
    const url = extras[i];
    const type = extraTypes[i] || "lifestyle";
    if (typeof url === "string" && url && (type === "flat" || type === "mockup")) return url;
  }

  // 3. primary (any type — even lifestyle as last resort)
  if (primaryUrl) return primaryUrl;

  // 4. first extra (any type)
  for (const url of extras) {
    if (typeof url === "string" && url) return url;
  }

  // 5. catalog fallback
  return product.catalog_styles?.style_image || "";
}
