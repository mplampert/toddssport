export type LeadTimeType = "standard" | "express" | "express_plus";

export interface Wholesale {
  baseCost: number;
  expressUpchargeCost: number;
  expressPlusUpchargeCost: number;
}

export interface EffectiveMarkup {
  markupPercent: number;
  rushMarkupPercent: number;
}

export interface ChamproProduct {
  id: string;
  product_master: string;
  sku: string | null;
  name: string;
  sport: string;
  moq_custom: number;
  default_lead_time_name: string | null;
}

export interface ChamproPricingSetting {
  id: string;
  scope: "global" | "sport";
  sport: string | null;
  markup_percent: number;
  rush_markup_percent: number;
}

export interface ChamproSkuOverride {
  id: string;
  champro_product_id: string;
  markup_percent: number | null;
  rush_markup_percent: number | null;
}

export interface FullProductPricing {
  product: ChamproProduct;
  wholesale: Wholesale;
  effectiveMarkup: EffectiveMarkup;
  hasSkuOverride: boolean;
  hasSportSetting: boolean;
}

/**
 * Get effective markup for a product following the hierarchy:
 * 1. Per-SKU override (champro_pricing_rules)
 * 2. Sport-level setting (champro_pricing_settings where scope = 'sport')
 * 3. Global default (champro_pricing_settings where scope = 'global')
 */
export function getEffectiveMarkup(params: {
  skuOverride?: { markup_percent: number | null; rush_markup_percent: number | null } | null;
  sportSetting?: { markup_percent: number; rush_markup_percent: number } | null;
  globalSetting: { markup_percent: number; rush_markup_percent: number };
}): EffectiveMarkup {
  const { skuOverride, sportSetting, globalSetting } = params;

  // 1. Per-SKU override (if both values are set)
  if (
    skuOverride?.markup_percent != null &&
    skuOverride?.rush_markup_percent != null
  ) {
    return {
      markupPercent: skuOverride.markup_percent,
      rushMarkupPercent: skuOverride.rush_markup_percent,
    };
  }

  // 2. Sport-level setting
  if (sportSetting) {
    return {
      markupPercent: sportSetting.markup_percent,
      rushMarkupPercent: sportSetting.rush_markup_percent,
    };
  }

  // 3. Global default
  return {
    markupPercent: globalSetting.markup_percent,
    rushMarkupPercent: globalSetting.rush_markup_percent,
  };
}

/**
 * Calculate the retail price per unit based on wholesale cost and markup
 */
export function calculateRetailPerUnit(
  wholesale: Wholesale,
  markup: EffectiveMarkup,
  leadTime: LeadTimeType
): number {
  // Base retail = wholesale base cost * (1 + markup)
  const baseRetail = wholesale.baseCost * (1 + markup.markupPercent / 100);

  // Calculate rush upcharge based on lead time
  let rushCost = 0;
  if (leadTime === "express") {
    rushCost = wholesale.expressUpchargeCost;
  } else if (leadTime === "express_plus") {
    rushCost = wholesale.expressPlusUpchargeCost;
  }

  // Apply rush markup to the rush cost
  const rushRetail = rushCost * (1 + markup.rushMarkupPercent / 100);

  return baseRetail + rushRetail;
}

/**
 * Calculate the total order amount for Champro uniforms
 */
export function calculateOrderTotal(
  quantity: number,
  wholesale: Wholesale,
  markup: EffectiveMarkup,
  leadTime: LeadTimeType
): number {
  const perUnit = calculateRetailPerUnit(wholesale, markup, leadTime);
  return quantity * perUnit;
}

/**
 * Get display name for lead time
 */
export function getLeadTimeDisplayName(leadTime: LeadTimeType): string {
  switch (leadTime) {
    case "standard":
      return "Standard (3-4 weeks)";
    case "express":
      return "10-Day Rush (+$)";
    case "express_plus":
      return "5-Day Rush (+$$)";
    default:
      return "Standard";
  }
}

/**
 * Map our lead time type to Champro's lead time name
 */
export function mapLeadTimeToChampro(leadTime: LeadTimeType): string {
  switch (leadTime) {
    case "standard":
      return "JUICE Standard";
    case "express":
      return "JUICE Express";
    case "express_plus":
      return "JUICE Express Plus";
    default:
      return "JUICE Standard";
  }
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
