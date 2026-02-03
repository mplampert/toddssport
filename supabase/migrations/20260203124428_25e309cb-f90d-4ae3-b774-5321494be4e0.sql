-- Create storage bucket for uniform images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uniform-images', 'uniform-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view uniform images"
ON storage.objects FOR SELECT
USING (bucket_id = 'uniform-images');

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload uniform images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uniform-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow admins to update/delete
CREATE POLICY "Admins can update uniform images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'uniform-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete uniform images"
ON storage.objects FOR DELETE
USING (bucket_id = 'uniform-images' AND auth.uid() IS NOT NULL);