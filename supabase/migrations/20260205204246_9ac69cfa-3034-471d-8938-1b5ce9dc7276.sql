
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

-- Recreate with proper restrictions (no OR true)
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
USING (
  session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-cart-session')
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can update their own cart items"
ON public.cart_items
FOR UPDATE
USING (
  session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-cart-session')
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can delete their own cart items"
ON public.cart_items
FOR DELETE
USING (
  session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-cart-session')
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);
