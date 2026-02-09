
-- Add variant-specific fields to team_store_item_logos
ALTER TABLE public.team_store_item_logos
  ADD COLUMN IF NOT EXISTS variant_color text,
  ADD COLUMN IF NOT EXISTS variant_size text;

COMMENT ON COLUMN public.team_store_item_logos.variant_color IS 'If null, applies to all colors. If set, applies only to this color.';
COMMENT ON COLUMN public.team_store_item_logos.variant_size IS 'If null, applies to all sizes. If set, applies only to this size.';

-- Index for efficient storefront lookups
CREATE INDEX IF NOT EXISTS idx_item_logos_variant
  ON public.team_store_item_logos(team_store_item_id, variant_color);
