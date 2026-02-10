
-- Add organization and notes to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
