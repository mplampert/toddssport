-- Add unique constraint on brands.name to support upserts
ALTER TABLE public.brands ADD CONSTRAINT brands_name_unique UNIQUE (name);
