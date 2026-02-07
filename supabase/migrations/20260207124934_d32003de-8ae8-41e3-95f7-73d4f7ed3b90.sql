
-- Add preview_token column with auto-generated default
ALTER TABLE public.team_stores
ADD COLUMN IF NOT EXISTS preview_token text DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill existing rows that have null preview_token
UPDATE public.team_stores
SET preview_token = encode(gen_random_bytes(16), 'hex')
WHERE preview_token IS NULL;

-- Make it NOT NULL going forward
ALTER TABLE public.team_stores
ALTER COLUMN preview_token SET NOT NULL;

-- Create a DB function to verify preview access
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
      AND status IN ('draft', 'open')
  ) t;
$$;
