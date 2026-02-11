-- Allow anyone to read active master products (for public catalog)
CREATE POLICY "Anyone can read active master products"
ON public.master_products
FOR SELECT
USING (active = true);
