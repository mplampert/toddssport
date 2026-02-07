-- Add status column to team_stores
ALTER TABLE public.team_stores
  ADD COLUMN status text NOT NULL DEFAULT 'scheduled';

-- Set initial status values based on existing data
-- Active stores with start_date in the past → 'open'
-- Active stores with end_date in the past → 'closed'
-- Inactive stores → 'closed'
-- Everything else → 'scheduled'
UPDATE public.team_stores
SET status = CASE
  WHEN active = false THEN 'closed'
  WHEN end_date IS NOT NULL AND end_date < CURRENT_DATE THEN 'closed'
  WHEN start_date IS NULL OR start_date <= CURRENT_DATE THEN 'open'
  ELSE 'scheduled'
END;

-- Update the public view to include status
DROP VIEW IF EXISTS public.team_stores_public;
CREATE VIEW public.team_stores_public AS
  SELECT id, name, slug, active, start_date, end_date, logo_url,
         primary_color, secondary_color, created_at, updated_at, status
  FROM public.team_stores
  WHERE active = true OR status = 'closed';
