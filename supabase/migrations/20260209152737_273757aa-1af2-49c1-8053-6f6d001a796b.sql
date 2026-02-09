
-- ============================================================
-- A) Personalization defaults per store
-- ============================================================
CREATE TABLE public.team_store_personalization_defaults (
  store_id UUID NOT NULL PRIMARY KEY REFERENCES public.team_stores(id) ON DELETE CASCADE,
  enable_name BOOLEAN NOT NULL DEFAULT false,
  name_label TEXT NOT NULL DEFAULT 'Name',
  name_required BOOLEAN NOT NULL DEFAULT false,
  name_max_length INTEGER NOT NULL DEFAULT 16,
  name_price NUMERIC NOT NULL DEFAULT 0,
  enable_number BOOLEAN NOT NULL DEFAULT false,
  number_label TEXT NOT NULL DEFAULT 'Number',
  number_required BOOLEAN NOT NULL DEFAULT false,
  number_max_length INTEGER NOT NULL DEFAULT 2,
  number_price NUMERIC NOT NULL DEFAULT 0,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_store_personalization_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage personalization defaults"
  ON public.team_store_personalization_defaults FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read personalization defaults"
  ON public.team_store_personalization_defaults FOR SELECT
  USING (true);

-- ============================================================
-- B) Decoration pricing defaults per store
-- ============================================================
CREATE TABLE public.team_store_decoration_price_defaults (
  store_id UUID NOT NULL PRIMARY KEY REFERENCES public.team_stores(id) ON DELETE CASCADE,
  pricing_mode TEXT NOT NULL DEFAULT 'per_placement',
  prices JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_store_decoration_price_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage decoration price defaults"
  ON public.team_store_decoration_price_defaults FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read decoration price defaults"
  ON public.team_store_decoration_price_defaults FOR SELECT
  USING (true);

-- ============================================================
-- C) Per-product override columns on team_store_products
-- ============================================================
ALTER TABLE public.team_store_products
  ADD COLUMN IF NOT EXISTS personalization_override_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personalization_settings JSONB,
  ADD COLUMN IF NOT EXISTS decoration_pricing_override_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS decoration_prices_override JSONB;

-- ============================================================
-- D) Add pricing snapshot columns on order items
-- ============================================================
ALTER TABLE public.team_store_order_items
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

-- ============================================================
-- E) Updated_at triggers
-- ============================================================
CREATE TRIGGER update_personalization_defaults_updated_at
  BEFORE UPDATE ON public.team_store_personalization_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decoration_price_defaults_updated_at
  BEFORE UPDATE ON public.team_store_decoration_price_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
