-- Add size_upcharges JSON column to team_store_products
-- Stores a map of size name → upcharge amount, e.g. {"2XL": 2.00, "3XL": 3.00}
ALTER TABLE public.team_store_products
ADD COLUMN IF NOT EXISTS size_upcharges jsonb DEFAULT '{}'::jsonb;