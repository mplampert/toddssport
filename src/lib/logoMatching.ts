/**
 * Shared utility for matching logo placements to the current variant.
 *
 * Specificity order (most → least):
 *   1. variant_color + variant_size match
 *   2. variant_color match (variant_size = null)
 *   3. global (variant_color = null, variant_size = null)
 *
 * Returns the best-matching set of logo assignments for a given color/size.
 */

export interface LogoAssignment {
  id: string;
  x: number;
  y: number;
  scale: number;
  is_primary: boolean;
  position?: string | null;
  variant_color?: string | null;
  variant_size?: string | null;
  store_logos: { name: string; file_url: string } | null;
}

/**
 * Given all logo assignments for a product and the active color/size,
 * return the best-matching set using specificity rules.
 */
export function matchLogosForVariant(
  allLogos: LogoAssignment[],
  activeColor?: string | null,
  activeSize?: string | null,
): LogoAssignment[] {
  if (allLogos.length === 0) return [];

  // Bucket logos by specificity
  const colorSizeMatch: LogoAssignment[] = [];
  const colorMatch: LogoAssignment[] = [];
  const global: LogoAssignment[] = [];

  for (const logo of allLogos) {
    const vc = logo.variant_color;
    const vs = logo.variant_size;

    if (vc && vs && activeColor && activeSize && vc === activeColor && vs === activeSize) {
      colorSizeMatch.push(logo);
    } else if (vc && !vs && activeColor && vc === activeColor) {
      colorMatch.push(logo);
    } else if (!vc && !vs) {
      global.push(logo);
    }
  }

  // Return highest-specificity non-empty bucket
  if (colorSizeMatch.length > 0) return colorSizeMatch;
  if (colorMatch.length > 0) return colorMatch;
  return global;
}
