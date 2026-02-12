
-- Add unique constraint on (source, source_sku) to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_products_source_sku_unique 
ON master_products (source, source_sku);
