
-- Drop the partial unique index and create a proper one for upsert support
DROP INDEX IF EXISTS master_products_source_sku_uniq;

-- Create a proper unique constraint (not partial) so ON CONFLICT works
CREATE UNIQUE INDEX master_products_source_source_sku_key 
ON public.master_products (source, source_sku);
