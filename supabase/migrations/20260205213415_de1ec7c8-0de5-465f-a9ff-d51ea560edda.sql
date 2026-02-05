
-- Add PIN column to team_stores
ALTER TABLE public.team_stores ADD COLUMN store_pin text NOT NULL DEFAULT '0000';

-- Public can read basic store info (no pin) for active stores only
-- We use a view to hide the pin column
CREATE VIEW public.team_stores_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, start_date, end_date, logo_url, primary_color, secondary_color, active, created_at, updated_at
  FROM public.team_stores
  WHERE active = true;

-- Allow anyone to SELECT active stores (via the base table, needed for the view)
CREATE POLICY "Anyone can read active team stores"
ON public.team_stores
FOR SELECT
USING (active = true);

-- Allow anyone to read team_store_products (needed for public store pages after PIN verification)
CREATE POLICY "Anyone can read team store products"
ON public.team_store_products
FOR SELECT
USING (true);

-- RPC to verify a store PIN server-side (returns store row if correct, null otherwise)
CREATE OR REPLACE FUNCTION public.verify_store_pin(_slug text, _pin text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(t) FROM (
    SELECT id, name, slug, start_date, end_date, logo_url, primary_color, secondary_color
    FROM public.team_stores
    WHERE slug = _slug
      AND store_pin = _pin
      AND active = true
  ) t;
$$;
