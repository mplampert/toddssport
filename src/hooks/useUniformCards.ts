import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UniformCard {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  image_url: string | null;
  icon: string | null;
  cta_text: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  featured_label: string | null;
}

export function useUniformCards() {
  const [cards, setCards] = useState<UniformCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("uniform_cards")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setCards(data || []);
      }
      setLoading(false);
    };

    fetchCards();
  }, []);

  const getFeaturedCards = () => cards.filter((card) => card.is_featured);

  const getCardBySlug = (slug: string) => cards.find((card) => card.slug === slug);

  return { cards, loading, error, getFeaturedCards, getCardBySlug };
}

export function useUniformCardBySlug(slug: string | undefined) {
  const [card, setCard] = useState<UniformCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchCard = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("uniform_cards")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) {
        setError(error.message);
        setCard(null);
      } else {
        setCard(data);
      }
      setLoading(false);
    };

    fetchCard();
  }, [slug]);

  return { card, loading, error };
}

// Fetch all cards for navigation purposes (e.g., "other sports" section)
export async function fetchAllUniformCards(): Promise<UniformCard[]> {
  const { data } = await supabase
    .from("uniform_cards")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return data || [];
}
