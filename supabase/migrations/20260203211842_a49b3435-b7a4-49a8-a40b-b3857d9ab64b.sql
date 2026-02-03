-- Add sent_to_champro boolean to track successful Champro API submission
ALTER TABLE public.champro_orders
ADD COLUMN sent_to_champro boolean NOT NULL DEFAULT false;

-- Add champro_order_number to store the returned order number
ALTER TABLE public.champro_orders
ADD COLUMN champro_order_number text;

-- Add index for quick lookups of orders not yet sent
CREATE INDEX idx_champro_orders_not_sent ON public.champro_orders (sent_to_champro) WHERE sent_to_champro = false;