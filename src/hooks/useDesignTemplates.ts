import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DesignTemplate {
  id: string;
  code: string;
  sport: string;
  category: string;
  name: string;
  image_url: string | null;
  tags: string[];
  active: boolean;
  sort_order: number;
}

export const DESIGN_CATEGORIES = [
  { value: "classic", label: "Classic" },
  { value: "bold", label: "Bold & Energetic" },
  { value: "popular", label: "Most Popular" },
  { value: "retro", label: "Retro" },
  { value: "slogans", label: "Slogans" },
] as const;

export function useDesignTemplates(category?: string) {
  return useQuery({
    queryKey: ["design-templates", category],
    queryFn: async () => {
      let query = supabase
        .from("design_templates")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DesignTemplate[];
    },
  });
}
