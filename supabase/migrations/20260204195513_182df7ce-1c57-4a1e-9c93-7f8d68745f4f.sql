-- =============================================
-- CATALOG DATA TABLES FOR LOOKBOOK & AI TOOLS
-- =============================================

-- Categories table - lookup for style categorization
CREATE TABLE public.catalog_categories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Styles table - main product catalog
CREATE TABLE public.catalog_styles (
  id SERIAL PRIMARY KEY,
  style_id INTEGER UNIQUE NOT NULL,
  part_number TEXT,
  brand_name TEXT NOT NULL,
  style_name TEXT NOT NULL,
  unique_style_name TEXT,
  title TEXT,
  description TEXT,
  base_category TEXT,
  categories TEXT, -- comma-separated category IDs
  catalog_page_number INTEGER,
  new_style BOOLEAN DEFAULT false,
  comparable_group INTEGER,
  companion_group INTEGER,
  brand_image TEXT,
  style_image TEXT,
  prop65_chemicals TEXT,
  sustainable_style BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Specs table - detailed specifications linked to styles
CREATE TABLE public.catalog_specs (
  id SERIAL PRIMARY KEY,
  spec_id INTEGER UNIQUE NOT NULL,
  style_id INTEGER NOT NULL,
  part_number TEXT,
  brand_name TEXT,
  style_name TEXT,
  size_name TEXT,
  size_order TEXT,
  spec_name TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Days in transit lookup (placeholder - will populate if file available)
CREATE TABLE public.catalog_transit_days (
  id SERIAL PRIMARY KEY,
  ship_from TEXT NOT NULL,
  ship_to TEXT NOT NULL,
  transit_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_transit_days ENABLE ROW LEVEL SECURITY;

-- Categories: Anyone can read
CREATE POLICY "Anyone can read catalog categories"
ON public.catalog_categories FOR SELECT USING (true);

-- Categories: Admins can manage
CREATE POLICY "Admins can manage catalog categories"
ON public.catalog_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Styles: Anyone can read active
CREATE POLICY "Anyone can read active catalog styles"
ON public.catalog_styles FOR SELECT USING (is_active = true);

-- Styles: Admins can read all
CREATE POLICY "Admins can read all catalog styles"
ON public.catalog_styles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Styles: Admins can manage
CREATE POLICY "Admins can manage catalog styles"
ON public.catalog_styles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Specs: Anyone can read
CREATE POLICY "Anyone can read catalog specs"
ON public.catalog_specs FOR SELECT USING (true);

-- Specs: Admins can manage
CREATE POLICY "Admins can manage catalog specs"
ON public.catalog_specs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Transit days: Anyone can read
CREATE POLICY "Anyone can read catalog transit days"
ON public.catalog_transit_days FOR SELECT USING (true);

-- Transit days: Admins can manage
CREATE POLICY "Admins can manage catalog transit days"
ON public.catalog_transit_days FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for common queries
CREATE INDEX idx_catalog_styles_brand ON public.catalog_styles(brand_name);
CREATE INDEX idx_catalog_styles_base_category ON public.catalog_styles(base_category);
CREATE INDEX idx_catalog_styles_featured ON public.catalog_styles(is_featured) WHERE is_featured = true;
CREATE INDEX idx_catalog_specs_style_id ON public.catalog_specs(style_id);

-- Add updated_at trigger for styles
CREATE TRIGGER update_catalog_styles_updated_at
BEFORE UPDATE ON public.catalog_styles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();