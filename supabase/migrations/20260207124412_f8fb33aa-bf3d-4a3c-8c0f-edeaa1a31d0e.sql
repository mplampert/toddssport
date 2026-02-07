
-- Create store_logo_variants table
CREATE TABLE public.store_logo_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_logo_id uuid NOT NULL REFERENCES public.store_logos(id) ON DELETE CASCADE,
  name text NOT NULL,
  colorway text NOT NULL DEFAULT 'black',
  file_url text NOT NULL,
  screen_print_enabled boolean NOT NULL DEFAULT false,
  embroidery_enabled boolean NOT NULL DEFAULT false,
  dtf_enabled boolean NOT NULL DEFAULT false,
  background_rule text NOT NULL DEFAULT 'any',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for fast lookup by parent logo
CREATE INDEX idx_store_logo_variants_logo_id ON public.store_logo_variants(store_logo_id);

-- Enable RLS
ALTER TABLE public.store_logo_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage logo variants"
  ON public.store_logo_variants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read logo variants"
  ON public.store_logo_variants FOR SELECT
  USING (true);

-- Add store_logo_variant_id to team_store_item_logos
ALTER TABLE public.team_store_item_logos
  ADD COLUMN store_logo_variant_id uuid REFERENCES public.store_logo_variants(id) ON DELETE SET NULL;

-- Migrate existing item_logos: create a default variant for each store_logo currently referenced,
-- then update team_store_item_logos to point to those variants
INSERT INTO public.store_logo_variants (store_logo_id, name, colorway, file_url, screen_print_enabled, embroidery_enabled, dtf_enabled, is_default)
SELECT DISTINCT sl.id, 'Default', 'original', sl.file_url,
  COALESCE(sl.method = 'Screen Print', false),
  COALESCE(sl.method = 'Embroidery', false),
  COALESCE(sl.method = 'DTF', false),
  true
FROM public.store_logos sl;

-- Point existing item_logos to the new default variants
UPDATE public.team_store_item_logos til
SET store_logo_variant_id = slv.id
FROM public.store_logo_variants slv
WHERE slv.store_logo_id = til.store_logo_id
  AND slv.is_default = true;
