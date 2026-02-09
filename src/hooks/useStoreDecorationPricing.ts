import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DecorationPrices {
  [method: string]: { [placement: string]: number };
}

export interface DecorationPricingDefaults {
  pricing_mode: string;
  prices: DecorationPrices;
}

export const DEFAULT_DECORATION_PRICING: DecorationPricingDefaults = {
  pricing_mode: "per_placement",
  prices: {},
};

export const DECORATION_METHODS = [
  { value: "print", label: "Screen Print" },
  { value: "embroidery", label: "Embroidery" },
  { value: "dtf", label: "DTF" },
];

export const DECORATION_PLACEMENTS = [
  { value: "left_chest", label: "Left Chest" },
  { value: "right_chest", label: "Right Chest" },
  { value: "full_front", label: "Full Front" },
  { value: "full_back", label: "Full Back" },
  { value: "sleeve_left", label: "Left Sleeve" },
  { value: "sleeve_right", label: "Right Sleeve" },
  { value: "hat_front", label: "Hat Front" },
  { value: "bag_center", label: "Bag Center" },
];

export function useStoreDecorationPricingDefaults(storeId: string) {
  return useQuery({
    queryKey: ["store-decoration-pricing-defaults", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_decoration_price_defaults")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULT_DECORATION_PRICING) as DecorationPricingDefaults;
    },
    enabled: !!storeId,
  });
}

/** Resolve effective decoration prices: product override > store defaults */
export function resolveDecorationPricing(
  storeDefaults: DecorationPricingDefaults | undefined,
  product?: { decoration_pricing_override_enabled?: boolean; decoration_prices_override?: any }
): DecorationPricingDefaults {
  const base = storeDefaults ?? DEFAULT_DECORATION_PRICING;
  if (!product?.decoration_pricing_override_enabled || !product.decoration_prices_override) {
    return base;
  }
  return {
    pricing_mode: product.decoration_prices_override.pricing_mode ?? base.pricing_mode,
    prices: product.decoration_prices_override.prices ?? product.decoration_prices_override ?? {},
  };
}

/** Calculate total decoration upcharge for a product's assigned logos */
export function calculateDecorationUpcharge(
  effectivePricing: DecorationPricingDefaults,
  assignedPlacements: { method: string; placement: string }[]
): number {
  let total = 0;
  for (const ap of assignedPlacements) {
    const methodPrices = effectivePricing.prices[ap.method];
    if (methodPrices && methodPrices[ap.placement] != null) {
      total += methodPrices[ap.placement];
    }
  }
  return total;
}
