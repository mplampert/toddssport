
-- Table to store per-color variant images for team store products
CREATE TABLE public.team_store_product_variant_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_product_id UUID NOT NULL REFERENCES public.team_store_products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'lifestyle',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by product
CREATE INDEX idx_variant_images_product ON public.team_store_product_variant_images(team_store_product_id);
CREATE INDEX idx_variant_images_product_color ON public.team_store_product_variant_images(team_store_product_id, color);

-- Enable RLS
ALTER TABLE public.team_store_product_variant_images ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage variant images"
ON public.team_store_product_variant_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read (storefront needs this)
CREATE POLICY "Anyone can read variant images"
ON public.team_store_product_variant_images
FOR SELECT
USING (true);
