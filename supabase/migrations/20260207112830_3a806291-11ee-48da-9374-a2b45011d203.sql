
-- Create storage bucket for store logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload
CREATE POLICY "Admins can upload store logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update
CREATE POLICY "Admins can update store logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete store logos
CREATE POLICY "Admins can delete store logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Public read for store logos
CREATE POLICY "Anyone can read store logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');
