
-- Add style_code column to master_products
ALTER TABLE master_products ADD COLUMN style_code text;

-- Backfill: for ss_activewear records, source_sku from ss-full-sync IS the styleName (style code)
-- Set style_code = source_sku as best-effort for all ss_activewear records
UPDATE master_products SET style_code = source_sku WHERE source = 'ss_activewear' AND source_sku IS NOT NULL;

-- Create unique index on (source, style_code) - the new canonical key
CREATE UNIQUE INDEX idx_master_products_source_style_code 
ON master_products (source, style_code) WHERE style_code IS NOT NULL;

-- Drop old (source, source_sku) unique index since style_code is now canonical
DROP INDEX IF EXISTS idx_master_products_source_sku_unique;
