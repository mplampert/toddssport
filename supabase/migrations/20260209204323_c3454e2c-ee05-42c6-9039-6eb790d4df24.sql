-- Add original file tracking to store_logos
ALTER TABLE public.store_logos
  ADD COLUMN original_file_url text,
  ADD COLUMN file_type text NOT NULL DEFAULT 'image';
-- file_type values: 'svg', 'ai', 'eps', 'image' (png/jpg/etc)

COMMENT ON COLUMN public.store_logos.original_file_url IS 'Original uploaded file (AI/EPS/SVG) before any conversion. NULL if file_url IS the original.';
COMMENT ON COLUMN public.store_logos.file_type IS 'Type of the original upload: svg, ai, eps, or image';

-- Add original file tracking to store_logo_variants
ALTER TABLE public.store_logo_variants
  ADD COLUMN original_file_url text,
  ADD COLUMN file_type text NOT NULL DEFAULT 'image';

COMMENT ON COLUMN public.store_logo_variants.original_file_url IS 'Original uploaded file for this variant. NULL if file_url IS the original.';
COMMENT ON COLUMN public.store_logo_variants.file_type IS 'Type of the original upload: svg, ai, eps, or image';