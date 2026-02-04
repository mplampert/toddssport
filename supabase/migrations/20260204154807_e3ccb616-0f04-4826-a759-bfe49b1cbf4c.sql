-- Add needs_manual_champro flag to champro_orders
ALTER TABLE public.champro_orders 
ADD COLUMN IF NOT EXISTS needs_manual_champro boolean NOT NULL DEFAULT false;