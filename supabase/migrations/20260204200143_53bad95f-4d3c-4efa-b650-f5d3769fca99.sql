-- Create promo suppliers table (to support multiple PromoStandards vendors)
CREATE TABLE public.promo_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  api_base_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert ImprintID as initial supplier
INSERT INTO public.promo_suppliers (name, code, api_base_url) 
VALUES ('ImprintID', 'imprintid', 'https://productdata.imprintid.com');

-- Create promo products table (synced from PromoStandards Product Data API)
CREATE TABLE public.promo_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.promo_suppliers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  price_type TEXT,
  product_brand TEXT,
  export_date TIMESTAMP WITH TIME ZONE,
  product_category TEXT,
  product_sub_category TEXT,
  product_keywords TEXT[],
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, product_id)
);

-- Create promo media table (synced from PromoStandards Media Content API)
CREATE TABLE public.promo_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_product_id UUID NOT NULL REFERENCES public.promo_products(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'Image',
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  color TEXT,
  decoration_method TEXT,
  location TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promo pricing table (cached from PromoStandards Pricing API)
CREATE TABLE public.promo_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_product_id UUID NOT NULL REFERENCES public.promo_products(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD',
  fob_id TEXT,
  fob_postal_code TEXT,
  price_type TEXT,
  quantity_min INTEGER,
  quantity_max INTEGER,
  price NUMERIC(10,4),
  discount_code TEXT,
  price_effective_date DATE,
  price_expiry_date DATE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_promo_products_supplier ON public.promo_products(supplier_id);
CREATE INDEX idx_promo_products_category ON public.promo_products(product_category);
CREATE INDEX idx_promo_products_featured ON public.promo_products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_promo_media_product ON public.promo_media(promo_product_id);
CREATE INDEX idx_promo_pricing_product ON public.promo_pricing(promo_product_id);

-- Enable RLS
ALTER TABLE public.promo_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for promo_suppliers
CREATE POLICY "Anyone can read promo suppliers"
  ON public.promo_suppliers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage promo suppliers"
  ON public.promo_suppliers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for promo_products
CREATE POLICY "Anyone can read active promo products"
  ON public.promo_products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can read all promo products"
  ON public.promo_products FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage promo products"
  ON public.promo_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for promo_media
CREATE POLICY "Anyone can read promo media"
  ON public.promo_media FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage promo media"
  ON public.promo_media FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for promo_pricing
CREATE POLICY "Anyone can read promo pricing"
  ON public.promo_pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage promo pricing"
  ON public.promo_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_promo_suppliers_updated_at
  BEFORE UPDATE ON public.promo_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promo_products_updated_at
  BEFORE UPDATE ON public.promo_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promo_pricing_updated_at
  BEFORE UPDATE ON public.promo_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();