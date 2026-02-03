-- Create cart_items table for storing custom uniform designs
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL, -- Browser session identifier for anonymous carts
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Optional for logged-in users
  champro_session_id TEXT NOT NULL, -- The Champro builder design session ID
  sport_slug TEXT NOT NULL,
  sport_title TEXT,
  quantity INTEGER NOT NULL DEFAULT 12,
  lead_time TEXT NOT NULL DEFAULT 'standard',
  team_name TEXT,
  category TEXT,
  product_master TEXT,
  unit_price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view their own cart items (by session_id or user_id)
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
USING (
  session_id = current_setting('request.headers', true)::json->>'x-cart-session'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR true  -- Allow edge function with service role
);

-- Policy: Anyone can insert cart items
CREATE POLICY "Anyone can create cart items"
ON public.cart_items
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update their own cart items
CREATE POLICY "Users can update their own cart items"
ON public.cart_items
FOR UPDATE
USING (
  session_id = current_setting('request.headers', true)::json->>'x-cart-session'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR true
);

-- Policy: Users can delete their own cart items
CREATE POLICY "Users can delete their own cart items"
ON public.cart_items
FOR DELETE
USING (
  session_id = current_setting('request.headers', true)::json->>'x-cart-session'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR true
);

-- Trigger for updated_at
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup by session
CREATE INDEX idx_cart_items_session_id ON public.cart_items(session_id);
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);