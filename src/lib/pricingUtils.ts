/**
 * Shared pricing precedence logic.
 * Used in admin, storefront, checkout, manual orders, and reports.
 */

export interface PricingInput {
  priceOverride: number | null;
  basePrice?: number | null;
  productFundraisingPct: number | null;
  storeFundraisingPct: number | null;
  fundraisingAmountPerUnit: number | null;
}

/** price_override ?? base_price */
export function effectiveUnitPrice(input: PricingInput): number | null {
  return input.priceOverride ?? input.basePrice ?? null;
}

/** product override % → store default % → 0 */
export function effectiveFundraisingPct(input: PricingInput): number {
  return input.productFundraisingPct ?? input.storeFundraisingPct ?? 0;
}

/** flat amount override → computed from % × price */
export function effectiveFundraisingPerItem(input: PricingInput): number {
  if (input.fundraisingAmountPerUnit != null) return input.fundraisingAmountPerUnit;
  const price = effectiveUnitPrice(input);
  if (price == null) return 0;
  return price * effectiveFundraisingPct(input) / 100;
}

/** Snapshot saved with each order item for historical accuracy */
export function buildPricingSnapshot(input: PricingInput) {
  return {
    unit_price: effectiveUnitPrice(input),
    fundraising_pct: effectiveFundraisingPct(input),
    fundraising_per_item: effectiveFundraisingPerItem(input),
  };
}
