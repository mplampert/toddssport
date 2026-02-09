
-- Add Stripe payment tracking columns to team_store_orders
ALTER TABLE public.team_store_orders
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Allow anonymous/unauthenticated users to create orders (storefront checkout)
CREATE POLICY "Anyone can create orders"
  ON public.team_store_orders
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous users to update their own order (by id, for payment status)
CREATE POLICY "Anyone can update orders they created"
  ON public.team_store_orders
  FOR UPDATE
  USING (created_by IS NULL OR created_by = auth.uid());

-- Allow anonymous/unauthenticated users to create order items
CREATE POLICY "Anyone can create order items"
  ON public.team_store_order_items
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous users to create payment records
CREATE POLICY "Anyone can create payments"
  ON public.team_store_payments
  FOR INSERT
  WITH CHECK (true);
