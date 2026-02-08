
-- Add new columns for Store Details editor
ALTER TABLE public.team_stores
ADD COLUMN IF NOT EXISTS welcome_message text,
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS open_at timestamptz,
ADD COLUMN IF NOT EXISTS close_at timestamptz,
ADD COLUMN IF NOT EXISTS recurring_batch_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_batch_frequency text DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS recurring_batch_day_of_week integer,
ADD COLUMN IF NOT EXISTS recurring_batch_day_of_month integer,
ADD COLUMN IF NOT EXISTS recurring_batch_time time;

-- Create storage bucket for hero images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-heroes', 'store-heroes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to hero images
CREATE POLICY "Public read store heroes"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-heroes');

-- Allow authenticated uploads to hero images
CREATE POLICY "Auth users can upload store heroes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-heroes' AND auth.uid() IS NOT NULL);

-- Allow authenticated updates to hero images
CREATE POLICY "Auth users can update store heroes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-heroes' AND auth.uid() IS NOT NULL);
