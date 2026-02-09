
-- Team Store Orders
CREATE TABLE public.team_store_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('online', 'manual')),
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_name text,
  shipping_address1 text,
  shipping_address2 text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  fulfillment_method text NOT NULL DEFAULT 'ship' CHECK (fulfillment_method IN ('ship', 'pickup', 'deliver_to_coach')),
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'in_progress', 'fulfilled', 'partially_fulfilled')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'completed', 'cancelled', 'refunded')),
  subtotal numeric NOT NULL DEFAULT 0,
  discount_total numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  shipping_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  internal_notes text,
  customer_notes text,
  is_sample boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER update_team_store_orders_updated_at
  BEFORE UPDATE ON public.team_store_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.team_store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team store orders"
  ON public.team_store_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read team store orders"
  ON public.team_store_orders FOR SELECT
  USING (true);

-- Team Store Order Items
CREATE TABLE public.team_store_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.team_store_orders(id) ON DELETE CASCADE,
  team_store_product_id uuid REFERENCES public.team_store_products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  variant_snapshot jsonb DEFAULT '{}'::jsonb,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  personalization_name text,
  personalization_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER update_team_store_order_items_updated_at
  BEFORE UPDATE ON public.team_store_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.team_store_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order items"
  ON public.team_store_order_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read order items"
  ON public.team_store_order_items FOR SELECT
  USING (true);

-- Team Store Payments (ledger)
CREATE TABLE public.team_store_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.team_store_orders(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'payment' CHECK (type IN ('payment', 'refund', 'adjustment')),
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'check', 'card', 'venmo', 'other')),
  amount numeric NOT NULL DEFAULT 0,
  provider text DEFAULT 'manual',
  provider_ref text,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_store_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments"
  ON public.team_store_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read payments"
  ON public.team_store_payments FOR SELECT
  USING (true);

-- Sequence for order numbers per store
CREATE SEQUENCE public.team_store_order_seq START 1001;
