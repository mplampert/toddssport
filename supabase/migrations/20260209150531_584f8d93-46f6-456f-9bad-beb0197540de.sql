
-- Add image type metadata to team_store_products
ALTER TABLE public.team_store_products
  ADD COLUMN IF NOT EXISTS primary_image_type text NOT NULL DEFAULT 'lifestyle',
  ADD COLUMN IF NOT EXISTS extra_image_types text[] NOT NULL DEFAULT '{}';

-- Add a comment for documentation
COMMENT ON COLUMN public.team_store_products.primary_image_type IS 'lifestyle | flat | mockup';
COMMENT ON COLUMN public.team_store_products.extra_image_types IS 'Parallel array to extra_image_urls: lifestyle | flat | mockup';
