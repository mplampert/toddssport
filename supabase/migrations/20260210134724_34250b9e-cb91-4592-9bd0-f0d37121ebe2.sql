
-- =====================================================
-- 1. Extend brands table with description
-- =====================================================
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS description TEXT;

-- =====================================================
-- 2. Create master_products table
-- =====================================================
CREATE TABLE public.master_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  product_type TEXT NOT NULL DEFAULT 'blank_apparel',
  source TEXT NOT NULL DEFAULT 'internal',
  source_sku TEXT,
  default_vendor TEXT,
  default_vendor_sku TEXT,
  description_short TEXT,
  image_url TEXT,
  available_colors JSONB DEFAULT '[]'::jsonb,
  available_sizes JSONB DEFAULT '[]'::jsonb,
  decoration_rules JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_products_brand ON public.master_products(brand_id);
CREATE INDEX idx_master_products_source ON public.master_products(source);
CREATE INDEX idx_master_products_category ON public.master_products(category);
CREATE INDEX idx_master_products_active ON public.master_products(active);

ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage master products"
  ON public.master_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. Create product_sources table
-- =====================================================
CREATE TABLE public.product_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_sku TEXT,
  cost NUMERIC,
  extra_data_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_sources_master ON public.product_sources(master_product_id);

ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product sources"
  ON public.product_sources FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 4. Add master_product_id to team_store_products (optional, transition)
-- =====================================================
ALTER TABLE public.team_store_products
  ADD COLUMN IF NOT EXISTS master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tsp_master_product ON public.team_store_products(master_product_id);

-- =====================================================
-- 5. Updated_at triggers
-- =====================================================
CREATE TRIGGER update_master_products_updated_at
  BEFORE UPDATE ON public.master_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_sources_updated_at
  BEFORE UPDATE ON public.product_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
