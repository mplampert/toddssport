-- Fix the security definer view by making it use invoker security
DROP VIEW IF EXISTS public.team_stores_public;
CREATE VIEW public.team_stores_public
WITH (security_invoker = true) AS
  SELECT id, name, slug, active, start_date, end_date, logo_url,
         primary_color, secondary_color, created_at, updated_at, status
  FROM public.team_stores
  WHERE active = true OR status = 'closed';
