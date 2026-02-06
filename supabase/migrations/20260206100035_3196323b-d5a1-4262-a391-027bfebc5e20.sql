
-- Add new columns to team_stores for the wizard
ALTER TABLE public.team_stores
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS store_type text DEFAULT 'spirit_wear',
  ADD COLUMN IF NOT EXISTS hero_title text,
  ADD COLUMN IF NOT EXISTS hero_subtitle text,
  ADD COLUMN IF NOT EXISTS fundraising_goal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fundraising_percent numeric DEFAULT 20;
