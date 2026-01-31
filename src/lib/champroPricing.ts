export type LeadTimeType = "standard" | "express" | "express_plus";
export type ChamproCategory = "JERSEYS" | "TSHIRTS" | "PANTS" | "OUTERWEAR" | "SHORTS" | "ACCESSORIES";

export interface Wholesale {
  baseCost: number;
}

export interface GlobalPricing {
  markupPercent: number;
  rushPercent: number;
}

export interface ChamproSku {
  id: string;
  product_master: string;
  sku: string | null;
  name: string;
  sport: string;
  category: ChamproCategory;
  moq_custom: number;
  default_lead_time_name: string | null;
}

/**
 * Calculate the retail price per unit
 * Standard: baseCost * (1 + markupPercent/100)
 * Rush: baseRetail * (1 + rushPercent/100)
 */
export function calculatePerUnit(
  wholesale: Wholesale,
  pricing: GlobalPricing,
  leadTime: LeadTimeType
): number {
  const baseRetail = wholesale.baseCost * (1 + pricing.markupPercent / 100);

  if (leadTime === "standard") {
    return baseRetail;
  }

  // express / express_plus share same global rushPercent
  const rushMultiplier = 1 + pricing.rushPercent / 100;
  return baseRetail * rushMultiplier;
}

/**
 * Calculate the total order amount for Champro uniforms
 */
export function calculateOrderTotal(
  quantity: number,
  wholesale: Wholesale,
  pricing: GlobalPricing,
  leadTime: LeadTimeType
): number {
  return calculatePerUnit(wholesale, pricing, leadTime) * quantity;
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
 * Get display name for category
 */
export function getCategoryDisplayName(category: ChamproCategory): string {
  switch (category) {
    case "JERSEYS":
      return "Jerseys";
    case "TSHIRTS":
      return "T-Shirts";
    case "PANTS":
      return "Pants";
    case "OUTERWEAR":
      return "Outerwear";
    case "SHORTS":
      return "Shorts";
    case "ACCESSORIES":
      return "Accessories";
    default:
      return category;
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
