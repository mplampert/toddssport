-- Add user_id column to champro_orders to track which customer placed the order
ALTER TABLE public.champro_orders 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add customer email column for guest checkouts
ALTER TABLE public.champro_orders 
ADD COLUMN customer_email TEXT;

-- Create index for faster lookups by user
CREATE INDEX idx_champro_orders_user_id ON public.champro_orders(user_id);

-- Add RLS policy for customers to view their own orders
CREATE POLICY "Users can view their own orders"
ON public.champro_orders FOR SELECT
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);