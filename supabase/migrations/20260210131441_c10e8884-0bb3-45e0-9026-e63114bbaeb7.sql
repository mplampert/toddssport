-- Add is_sample column to tables that need it for sample data cleanup
ALTER TABLE public.team_stores ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.team_store_products ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.team_store_order_items ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.fulfillment_batches ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.fundraising_payouts ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- Index for fast cleanup queries
CREATE INDEX IF NOT EXISTS idx_team_stores_is_sample ON public.team_stores(is_sample) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_team_store_orders_is_sample ON public.team_store_orders(is_sample) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_team_store_order_items_is_sample ON public.team_store_order_items(is_sample) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_team_store_products_is_sample ON public.team_store_products(is_sample) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_fulfillment_batches_is_sample ON public.fulfillment_batches(is_sample) WHERE is_sample = true;
CREATE INDEX IF NOT EXISTS idx_fundraising_payouts_is_sample ON public.fundraising_payouts(is_sample) WHERE is_sample = true;