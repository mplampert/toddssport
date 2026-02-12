
-- Add supplier_item_number column to master_products
ALTER TABLE public.master_products ADD COLUMN IF NOT EXISTS supplier_item_number text;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_master_products_supplier_item ON public.master_products (supplier_item_number) WHERE supplier_item_number IS NOT NULL;
