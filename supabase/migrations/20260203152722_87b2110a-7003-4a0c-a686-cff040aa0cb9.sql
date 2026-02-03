-- Add products JSONB column to flyers table for multiple products
ALTER TABLE public.flyers
ADD COLUMN products JSONB DEFAULT '[]'::jsonb;