
ALTER TABLE public.team_store_products
  ADD COLUMN display_name TEXT,
  ADD COLUMN display_color TEXT,
  ADD COLUMN primary_image_url TEXT,
  ADD COLUMN extra_image_urls JSONB DEFAULT '[]'::jsonb;
