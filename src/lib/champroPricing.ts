export type LeadTimeType = "standard" | "express" | "express_plus";

export interface Wholesale {
  base_cost_per_unit: number;
  express_upcharge_cost_per_unit: number;
  express_plus_upcharge_cost_per_unit: number;
}

export interface PricingRules {
  markup_percent: number;
  rush_markup_percent?: number | null;
}

export interface ChamproProduct {
  id: string;
  product_master: string;
  name: string;
  sport: string;
  moq_custom: number;
  default_lead_time_name: string | null;
}

export interface FullProductPricing {
  product: ChamproProduct;
  wholesale: Wholesale;
  pricing: PricingRules;
}

/**
 * Calculate the retail price per unit based on wholesale cost and markup
 */
export function calculateRetailPricePerUnit(params: {
  wholesale: Wholesale;
  pricing: PricingRules;
  leadTime: LeadTimeType;
}): number {
  const { wholesale, pricing, leadTime } = params;

  const markup = pricing.markup_percent / 100;
  const rushMarkup =
    (pricing.rush_markup_percent ?? pricing.markup_percent) / 100;

  // Base retail = wholesale base cost * (1 + markup)
  const baseRetail = wholesale.base_cost_per_unit * (1 + markup);

  // Calculate rush upcharge based on lead time
  let rushCost = 0;
  if (leadTime === "express") {
    rushCost = wholesale.express_upcharge_cost_per_unit;
  } else if (leadTime === "express_plus") {
    rushCost = wholesale.express_plus_upcharge_cost_per_unit;
  }

  // Apply rush markup to the rush cost
  const rushRetail = rushCost * (1 + rushMarkup);

  return baseRetail + rushRetail;
}

/**
 * Calculate the total order amount for Champro uniforms
 */
export function calculateChamproOrderTotal(params: {
  quantity: number;
  wholesale: Wholesale;
  pricing: PricingRules;
  leadTime: LeadTimeType;
}): number {
  const perUnit = calculateRetailPricePerUnit(params);
  return params.quantity * perUnit;
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
