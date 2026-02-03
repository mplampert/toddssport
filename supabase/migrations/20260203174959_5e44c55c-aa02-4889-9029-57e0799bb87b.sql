-- Add client contact information columns to flyers table
ALTER TABLE public.flyers 
ADD COLUMN IF NOT EXISTS client_contact_name TEXT,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS client_address TEXT,
ADD COLUMN IF NOT EXISTS client_city TEXT,
ADD COLUMN IF NOT EXISTS client_state TEXT,
ADD COLUMN IF NOT EXISTS client_zip TEXT;