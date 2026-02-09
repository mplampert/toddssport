/**
 * Helpers for effective description + size chart resolution.
 * Override fields on team_store_products always win over catalog data.
 */

export interface ProductWithOverrides {
  description_override?: string | null;
  short_description_override?: string | null;
  size_chart_override_id?: string | null;
  size_chart_display_mode?: string | null;
  catalog_styles?: {
    description?: string | null;
  } | null;
}

export function getEffectiveDescription(product: ProductWithOverrides): string | null {
  if (product.description_override?.trim()) return product.description_override;
  return product.catalog_styles?.description ?? null;
}

export function getEffectiveShortDescription(product: ProductWithOverrides): string | null {
  if (product.short_description_override?.trim()) return product.short_description_override;
  return null; // catalog doesn't have a separate short description field currently
}

export function getSizeChartDisplayMode(product: ProductWithOverrides): "tab" | "popup" | "inline" {
  const mode = product.size_chart_display_mode;
  if (mode === "tab" || mode === "popup" || mode === "inline") return mode;
  return "popup";
}
