-- Create products table for lookbook catalog
CREATE TABLE public.lookbook_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  type TEXT NOT NULL, -- 'uniform', 'jersey', 'hoodie', 'tee', 'hat', 'shorts', etc.
  image_url TEXT,
  msrp NUMERIC,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lookbook_products ENABLE ROW LEVEL SECURITY;

-- Admins can manage products
CREATE POLICY "Admins can manage lookbook products"
ON public.lookbook_products
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active products (for public lookbooks if needed later)
CREATE POLICY "Anyone can read active lookbook products"
ON public.lookbook_products
FOR SELECT
USING (is_active = true);

-- Create index for sport filtering
CREATE INDEX idx_lookbook_products_sport ON public.lookbook_products(sport);

-- Add updated_at trigger
CREATE TRIGGER update_lookbook_products_updated_at
BEFORE UPDATE ON public.lookbook_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();