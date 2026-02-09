
-- Add hero generation fields to team_stores
ALTER TABLE public.team_stores
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS mascot_name text,
  ADD COLUMN IF NOT EXISTS hero_style text DEFAULT 'clean_minimal';
