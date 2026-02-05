
-- Add notes, price_override, active to team_store_products
ALTER TABLE public.team_store_products
  ADD COLUMN notes text,
  ADD COLUMN price_override numeric,
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Make store_pin nullable (empty = no PIN required)
ALTER TABLE public.team_stores ALTER COLUMN store_pin DROP NOT NULL;
ALTER TABLE public.team_stores ALTER COLUMN store_pin DROP DEFAULT;

-- Add team_store_id to cart_items
ALTER TABLE public.cart_items
  ADD COLUMN team_store_id uuid REFERENCES public.team_stores(id);

-- Trigger for updated_at on team_store_products
CREATE TRIGGER update_team_store_products_updated_at
BEFORE UPDATE ON public.team_store_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
