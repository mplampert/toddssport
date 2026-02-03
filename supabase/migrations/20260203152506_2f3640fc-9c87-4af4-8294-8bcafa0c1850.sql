-- Create storage bucket for flyer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('flyer-images', 'flyer-images', true);

-- Storage policies for flyer images
CREATE POLICY "Anyone can read flyer images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'flyer-images');

CREATE POLICY "Authenticated users can upload flyer images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'flyer-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update flyer images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'flyer-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete flyer images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'flyer-images' AND auth.uid() IS NOT NULL);