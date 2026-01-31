-- Add category column to champro_products (now represents ChamproSku)
ALTER TABLE public.champro_products 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'JERSEYS';

-- Add check constraint for valid categories
ALTER TABLE public.champro_products
ADD CONSTRAINT valid_category CHECK (
  category IN ('JERSEYS', 'TSHIRTS', 'PANTS', 'OUTERWEAR', 'SHORTS', 'ACCESSORIES')
);

-- Create index for sport + category lookups
CREATE INDEX IF NOT EXISTS idx_champro_products_sport_category 
ON public.champro_products(sport, category);

-- Update global pricing setting to have rushPercent = 0 as default
UPDATE public.champro_pricing_settings 
SET rush_percent = 0 
WHERE scope = 'global';