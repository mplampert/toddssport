
-- 1) Add 'view' column to variant images (front, back, left, right, detail)
ALTER TABLE public.team_store_product_variant_images
  ADD COLUMN IF NOT EXISTS view text NOT NULL DEFAULT 'front';

-- 2) Add 'view' column to decoration_placements
ALTER TABLE public.decoration_placements
  ADD COLUMN IF NOT EXISTS view text NOT NULL DEFAULT 'front';

-- 3) Add 'view' column to team_store_item_logos
ALTER TABLE public.team_store_item_logos
  ADD COLUMN IF NOT EXISTS view text NOT NULL DEFAULT 'front';

-- 4) Add decoration_snapshot JSON to order items
ALTER TABLE public.team_store_order_items
  ADD COLUMN IF NOT EXISTS decoration_snapshot jsonb DEFAULT NULL;

-- 5) Index for fast variant image lookups by view
CREATE INDEX IF NOT EXISTS idx_variant_images_view
  ON public.team_store_product_variant_images (team_store_product_id, color, view);

-- 6) Index for placements by view
CREATE INDEX IF NOT EXISTS idx_placements_view
  ON public.decoration_placements (view, garment_type);

-- 7) Index for item logos by view
CREATE INDEX IF NOT EXISTS idx_item_logos_view
  ON public.team_store_item_logos (team_store_item_id, view);
