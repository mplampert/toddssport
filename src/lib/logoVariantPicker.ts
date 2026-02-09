/**
 * Auto-pick the best logo variant based on garment color brightness.
 *
 * Rules:
 *   - If garment is dark → prefer variant with background_rule = "dark_only" or colorway includes "white"
 *   - If garment is light → prefer variant with background_rule = "light_only" or colorway includes "black"
 *   - Fallback to the default variant (is_default = true), then first variant
 */

export interface LogoVariantOption {
  id: string;
  name: string;
  colorway: string;
  file_url: string;
  background_rule: string;
  is_default: boolean;
}

/**
 * Determine if a hex color string is "dark" (luminance < 0.5).
 * Accepts #RGB, #RRGGBB, or named CSS colors (returns null if unparseable).
 */
export function isColorDark(color: string | undefined | null): boolean | null {
  if (!color) return null;
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  // Relative luminance (simplified)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.5;
}

/**
 * Given a set of logo variants and the garment's primary hex color,
 * return the best-fit variant.
 */
export function pickBestVariant(
  variants: LogoVariantOption[],
  garmentHexColor?: string | null,
): LogoVariantOption | undefined {
  if (variants.length === 0) return undefined;
  if (variants.length === 1) return variants[0];

  const dark = isColorDark(garmentHexColor);

  if (dark === true) {
    // Dark garment → prefer white/light logo
    const darkOnly = variants.find((v) => v.background_rule === "dark_only");
    if (darkOnly) return darkOnly;
    const whitish = variants.find(
      (v) => /white|light/i.test(v.colorway) || /white|light/i.test(v.name),
    );
    if (whitish) return whitish;
  } else if (dark === false) {
    // Light garment → prefer dark/black logo
    const lightOnly = variants.find((v) => v.background_rule === "light_only");
    if (lightOnly) return lightOnly;
    const blackish = variants.find(
      (v) => /black|dark/i.test(v.colorway) || /black|dark/i.test(v.name),
    );
    if (blackish) return blackish;
  }

  // Fallback: default variant, then first
  return variants.find((v) => v.is_default) || variants[0];
}
