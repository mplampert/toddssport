
-- Add pickup_location to team_stores for per-store pickup address
ALTER TABLE public.team_stores ADD COLUMN IF NOT EXISTS pickup_location text;

-- Add default_pickup_location to team_store_settings for global default
ALTER TABLE public.team_store_settings ADD COLUMN IF NOT EXISTS default_pickup_location text;
