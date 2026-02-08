-- Add positioning fields to the existing logo assignment table
ALTER TABLE public.team_store_item_logos
  ADD COLUMN IF NOT EXISTS x NUMERIC NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS y NUMERIC NOT NULL DEFAULT 0.2,
  ADD COLUMN IF NOT EXISTS scale NUMERIC NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Index for quick lookups by product
CREATE INDEX IF NOT EXISTS idx_item_logos_product
  ON public.team_store_item_logos (team_store_item_id);
