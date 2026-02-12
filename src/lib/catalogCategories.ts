/**
 * Maps raw DB category values to user-friendly display groups.
 * Used for catalog tiles and filter chips.
 */

export interface CategoryGroup {
  label: string;
  icon: string; // lucide icon name or emoji
  dbValues: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "T-Shirts",
    icon: "👕",
    dbValues: ["t_shirts___premium", "t_shirts___core", "tee", "TSHIRTS", "T-Shirts - Premium"],
  },
  {
    label: "Hoodies & Sweatshirts",
    icon: "🧥",
    dbValues: [
      "fleece___premium___hood",
      "fleece___core___hood",
      "fleece___premium___crew",
      "fleece___core___crew",
      "Fleece - Premium - Crew",
    ],
  },
  {
    label: "Polos",
    icon: "👔",
    dbValues: ["polos", "Polos"],
  },
  {
    label: "Jerseys & Uniforms",
    icon: "🏆",
    dbValues: ["JERSEYS"],
  },
  {
    label: "Hats",
    icon: "🧢",
    dbValues: ["hat", "Headwear"],
  },
  {
    label: "Outerwear",
    icon: "🧥",
    dbValues: ["outerwear", "OUTERWEAR"],
  },
  {
    label: "Bottoms",
    icon: "👖",
    dbValues: ["bottoms", "SHORTS", "PANTS"],
  },
  {
    label: "Accessories",
    icon: "🎒",
    dbValues: [
      "accessory",
      "ACCESSORIES",
      "bag",
      "Badge Reels",
      "Drawstring Bags",
      "Lanyards",
      "Events &amp; Industries",
    ],
  },
  {
    label: "Wovens & Dress Shirts",
    icon: "👗",
    dbValues: ["wovens"],
  },
  {
    label: "Layering",
    icon: "🧤",
    dbValues: ["knits___layering", "Knits & Layering"],
  },
];

/** Returns the display group label for a raw DB category, or the formatted raw value as fallback. */
export function getCategoryGroupLabel(rawCategory: string): string {
  const group = CATEGORY_GROUPS.find((g) =>
    g.dbValues.some((v) => v.toLowerCase() === rawCategory.toLowerCase())
  );
  if (group) return group.label;
  // Fallback: format raw
  return rawCategory
    .replace(/___/g, " - ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build a Supabase OR filter string for a category group label. */
export function buildCategoryFilter(groupLabel: string): string[] {
  const group = CATEGORY_GROUPS.find((g) => g.label === groupLabel);
  return group ? group.dbValues : [groupLabel];
}
