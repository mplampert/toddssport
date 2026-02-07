
CREATE OR REPLACE FUNCTION public.get_store_for_preview(_slug text, _token text)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT row_to_json(t) FROM (
    SELECT id, name, slug, start_date, end_date, logo_url, primary_color, secondary_color,
           store_pin, status, active, description, hero_title, hero_subtitle,
           fundraising_percent, store_type
    FROM public.team_stores
    WHERE slug = _slug
      AND preview_token = _token
      AND status IN ('draft', 'open', 'scheduled')
  ) t;
$$;
