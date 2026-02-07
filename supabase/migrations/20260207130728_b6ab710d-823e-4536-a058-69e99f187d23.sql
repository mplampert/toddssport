-- Add allowed_colors JSONB column to team_store_products
-- Format: [{"code": "BLK", "name": "Black"}, {"code": "WHT", "name": "White"}]
-- When NULL, all colors are available (backward compatible)
ALTER TABLE public.team_store_products
ADD COLUMN allowed_colors jsonb DEFAULT NULL;