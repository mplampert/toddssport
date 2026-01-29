-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to brand logos
CREATE POLICY "Public read access for brand logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Allow authenticated uploads (for admin)
CREATE POLICY "Admin upload access for brand logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-logos');