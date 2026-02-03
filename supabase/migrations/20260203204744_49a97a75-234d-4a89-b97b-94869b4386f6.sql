-- Add type column to champro_products to distinguish categories from sellable products
ALTER TABLE public.champro_products 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'category';

-- Add price/msrp column for actual products
ALTER TABLE public.champro_products 
ADD COLUMN IF NOT EXISTS msrp numeric NULL;

-- Add has_sizes flag to indicate if product has size variants
ALTER TABLE public.champro_products 
ADD COLUMN IF NOT EXISTS has_sizes boolean NOT NULL DEFAULT false;

-- Add parent_category to link products to their category
ALTER TABLE public.champro_products 
ADD COLUMN IF NOT EXISTS parent_category text NULL;

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_champro_products_type ON public.champro_products(type);

-- Update existing records: mark as categories (they were placeholders)
UPDATE public.champro_products SET type = 'category' WHERE sku IS NULL OR sku = '';

-- Comment for clarity
COMMENT ON COLUMN public.champro_products.type IS 'category = organizational grouping, product = sellable SKU with price/sizes';