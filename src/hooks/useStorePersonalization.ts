import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomPersonalizationField {
  id: string;
  label: string;
  type: "text" | "dropdown";
  required: boolean;
  max_length: number; // for text fields
  options: string[]; // for dropdown fields
  price: number; // upcharge when filled
}

export interface PersonalizationSettings {
  enable_name: boolean;
  name_label: string;
  name_required: boolean;
  name_max_length: number;
  name_price: number;
  enable_number: boolean;
  number_label: string;
  number_required: boolean;
  number_max_length: number;
  number_price: number;
  instructions: string | null;
  custom_fields?: CustomPersonalizationField[];
}

export const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
  enable_name: false,
  name_label: "Name",
  name_required: false,
  name_max_length: 16,
  name_price: 0,
  enable_number: false,
  number_label: "Number",
  number_required: false,
  number_max_length: 2,
  number_price: 0,
  instructions: null,
  custom_fields: [],
};

export function useStorePersonalizationDefaults(storeId: string) {
  return useQuery({
    queryKey: ["store-personalization-defaults", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_personalization_defaults")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULT_PERSONALIZATION) as PersonalizationSettings;
    },
    enabled: !!storeId,
  });
}

/** Resolve effective settings: product override > store defaults */
export function resolvePersonalization(
  storeDefaults: PersonalizationSettings | undefined,
  product?: { personalization_override_enabled?: boolean; personalization_settings?: any }
): PersonalizationSettings {
  const base = storeDefaults ?? DEFAULT_PERSONALIZATION;
  if (!product?.personalization_override_enabled || !product.personalization_settings) {
    return { ...base, custom_fields: base.custom_fields ?? [] };
  }
  return { ...base, ...product.personalization_settings, custom_fields: product.personalization_settings.custom_fields ?? base.custom_fields ?? [] };
}
