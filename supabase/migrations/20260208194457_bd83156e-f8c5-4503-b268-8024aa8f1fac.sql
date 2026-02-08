
-- Add optional product_id to team_store_messages
ALTER TABLE public.team_store_messages
  ADD COLUMN product_id UUID REFERENCES public.team_store_products(id) ON DELETE CASCADE;

-- Index for product-specific message lookups
CREATE INDEX idx_team_store_messages_product ON public.team_store_messages(product_id) WHERE product_id IS NOT NULL;
