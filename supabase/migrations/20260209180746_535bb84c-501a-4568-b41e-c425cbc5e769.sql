-- Add role, sort_order, rotation, and active fields to team_store_item_logos
ALTER TABLE public.team_store_item_logos
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rotation numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Index for efficient querying by product + active + sort_order
CREATE INDEX IF NOT EXISTS idx_item_logos_product_active
  ON public.team_store_item_logos (team_store_item_id, active, sort_order);

-- Comment on role values
COMMENT ON COLUMN public.team_store_item_logos.role IS 'Logo role: primary, secondary, sponsor, league_patch, number_zone, other';
COMMENT ON COLUMN public.team_store_item_logos.sort_order IS 'Render order (lower = rendered first / behind)';
COMMENT ON COLUMN public.team_store_item_logos.rotation IS 'Rotation angle in degrees';
COMMENT ON COLUMN public.team_store_item_logos.active IS 'Whether this logo placement is currently active';