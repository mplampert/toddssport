
-- Table to store per-color images for master products (from S&S Activewear)
CREATE TABLE public.product_color_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id uuid NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  color_name text NOT NULL,
  color_code text,
  swatch_image_url text,
  front_image_url text,
  back_image_url text,
  side_image_url text,
  direct_side_image_url text,
  color1 text,
  color2 text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (master_product_id, color_name)
);

-- Enable RLS
ALTER TABLE public.product_color_images ENABLE ROW LEVEL SECURITY;

-- Admin-only access (read/write)
CREATE POLICY "Admins can manage product color images"
  ON public.product_color_images
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read access (for catalog pages to show color galleries)
CREATE POLICY "Public can view product color images"
  ON public.product_color_images
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_product_color_images_product ON public.product_color_images(master_product_id);

-- Add images_synced_at to master_products for tracking
ALTER TABLE public.master_products ADD COLUMN IF NOT EXISTS images_synced_at timestamptz;
