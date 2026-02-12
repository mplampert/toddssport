
-- Add featured/popularity and season/occasion metadata to master_products
ALTER TABLE public.master_products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popularity_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seasons text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occasions text[] DEFAULT '{}';

-- Index for featured products query
CREATE INDEX IF NOT EXISTS idx_master_products_featured
  ON public.master_products (is_featured, popularity_score DESC)
  WHERE active = true;

-- GIN indexes for array tag filtering
CREATE INDEX IF NOT EXISTS idx_master_products_seasons
  ON public.master_products USING GIN (seasons)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_master_products_occasions
  ON public.master_products USING GIN (occasions)
  WHERE active = true;
