/**
 * Standardized product name & SKU resolution.
 *
 * Data model:
 *   team_store_products.display_name   – optional storefront override
 *   catalog_styles.style_name          – the vendor style ID / SKU code (e.g. "5000B", "18000")
 *   catalog_styles.title               – descriptive name (e.g. "Youth Heavy Cotton™ T-Shirt")
 *   catalog_styles.brand_name          – brand
 *   catalog_styles.part_number         – item/part number
 *   catalog_styles.style_id            – numeric S&S Activewear ID
 *
 * Rules:
 *   Storefront (customer-facing):
 *     Name: display_name → catalog title → catalog style_name → fallback
 *     SKU:  hidden (or catalog style_name if needed)
 *
 *   Admin / work orders / production:
 *     Catalog Name: catalog title → catalog style_name
 *     Catalog SKU:  catalog style_name (always — this is the vendor style code)
 *     Storefront Title: display_name (shown as secondary if present)
 */

export interface CatalogStyleInfo {
  style_name?: string;
  brand_name?: string;
  style_id?: number;
  title?: string | null;
  part_number?: string | null;
}

export interface ProductIdentitySource {
  style_id?: number;
  display_name?: string | null;
  catalog_styles?: CatalogStyleInfo | null;
}

/**
 * Returns the customer-facing display name.
 * Used on: storefront grid, PDP header, cart, order confirmation.
 */
export function getDisplayName(product: ProductIdentitySource): string {
  if (product.display_name) return product.display_name;
  const cs = product.catalog_styles;
  if (cs?.title) return cs.title;
  if (cs?.style_name) return cs.style_name;
  return `Style #${product.style_id ?? "Unknown"}`;
}

/**
 * Returns the internal catalog name + SKU for admin/production views.
 * Used on: admin product list, work orders, production views, exports.
 *
 * catalogName = descriptive name from catalog (title → style_name)
 * catalogSku  = vendor style code (style_name — e.g. "5000B")
 * brand       = brand name
 * storefrontTitle = display_name override (if set), for reference
 */
export function getInternalIdentity(product: ProductIdentitySource): {
  catalogName: string;
  catalogSku: string;
  brand: string;
  storefrontTitle: string | null;
} {
  const cs = product.catalog_styles;
  return {
    catalogName: cs?.title || cs?.style_name || `Style #${product.style_id ?? "Unknown"}`,
    catalogSku: cs?.style_name || String(cs?.style_id ?? product.style_id ?? ""),
    brand: cs?.brand_name || "",
    storefrontTitle: product.display_name || null,
  };
}
