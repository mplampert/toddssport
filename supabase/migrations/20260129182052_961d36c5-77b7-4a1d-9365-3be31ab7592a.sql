-- Create enum for order types
CREATE TYPE public.champro_order_type AS ENUM ('CUSTOM', 'STOCK');

-- Create champro_orders table to log Champro API requests and responses
CREATE TABLE public.champro_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type champro_order_type NOT NULL,
  po TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  session_id TEXT,
  sub_order_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.champro_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can read all champro orders"
ON public.champro_orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert champro orders"
ON public.champro_orders
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update champro orders"
ON public.champro_orders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete champro orders"
ON public.champro_orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_champro_orders_updated_at
BEFORE UPDATE ON public.champro_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.champro_orders IS 'Stores Champro API order requests and responses for Custom and Stock orders';