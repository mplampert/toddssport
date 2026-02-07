
-- Global category library for team stores
CREATE TABLE public.team_store_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_store_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage team store categories"
  ON public.team_store_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active team store categories"
  ON public.team_store_categories
  FOR SELECT
  USING (is_active = true);

-- Add category_id to team_store_products
ALTER TABLE public.team_store_products
  ADD COLUMN category_id UUID NULL REFERENCES public.team_store_categories(id) ON DELETE SET NULL;

-- Seed common categories
INSERT INTO public.team_store_categories (name, slug, sort_order) VALUES
  ('T-Shirts', 't-shirts', 1),
  ('Sweatshirts & Hoodies', 'sweatshirts-hoodies', 2),
  ('Hats & Caps', 'hats-caps', 3),
  ('Jerseys', 'jerseys', 4),
  ('Shorts & Pants', 'shorts-pants', 5),
  ('Jackets & Outerwear', 'jackets-outerwear', 6),
  ('Polos', 'polos', 7),
  ('Accessories', 'accessories', 8),
  ('Bags & Backpacks', 'bags-backpacks', 9),
  ('Youth', 'youth', 10);

-- Trigger for updated_at
CREATE TRIGGER update_team_store_categories_updated_at
  BEFORE UPDATE ON public.team_store_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
