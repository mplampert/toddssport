
-- Add new columns to team_store_products
ALTER TABLE public.team_store_products
  ADD COLUMN IF NOT EXISTS fundraising_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fundraising_amount_per_unit numeric,
  ADD COLUMN IF NOT EXISTS personalization_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personalization_price numeric,
  ADD COLUMN IF NOT EXISTS personalization_config jsonb,
  ADD COLUMN IF NOT EXISTS screen_print_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS embroidery_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dtf_enabled boolean NOT NULL DEFAULT false;

-- Add fundraising_goal_amount to team_stores
ALTER TABLE public.team_stores
  ADD COLUMN IF NOT EXISTS fundraising_goal_amount numeric;

-- Create store_logos table
CREATE TABLE public.store_logos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_id uuid NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  method text NOT NULL,
  file_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.store_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store logos"
  ON public.store_logos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read store logos"
  ON public.store_logos FOR SELECT
  USING (true);

-- Create team_store_item_logos join table
CREATE TABLE public.team_store_item_logos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_item_id uuid NOT NULL REFERENCES public.team_store_products(id) ON DELETE CASCADE,
  store_logo_id uuid NOT NULL REFERENCES public.store_logos(id) ON DELETE CASCADE,
  position text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (team_store_item_id, store_logo_id)
);

ALTER TABLE public.team_store_item_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage item logos"
  ON public.team_store_item_logos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read item logos"
  ON public.team_store_item_logos FOR SELECT
  USING (true);
