-- Add organization and season columns to team_stores
ALTER TABLE public.team_stores ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE public.team_stores ADD COLUMN IF NOT EXISTS season text;