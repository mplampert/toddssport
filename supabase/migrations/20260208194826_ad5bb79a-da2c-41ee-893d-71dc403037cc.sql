
-- Create bucket for store product image overrides
INSERT INTO storage.buckets (id, name, public) VALUES ('store-product-images', 'store-product-images', true);

-- Allow anyone to view
CREATE POLICY "Store product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-product-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload store product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-product-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete store product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-product-images' AND auth.role() = 'authenticated');
