
-- Add brand_colors array to team_stores
ALTER TABLE public.team_stores
ADD COLUMN brand_colors text[] DEFAULT '{}';

-- Add is_primary flag to store_logos
ALTER TABLE public.store_logos
ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
