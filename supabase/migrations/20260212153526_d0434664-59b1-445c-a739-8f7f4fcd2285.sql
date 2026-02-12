-- Table for per-size pricing tiers (upsize charges)
CREATE TABLE public.product_size_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  piece_price NUMERIC(10,2),
  dozen_price NUMERIC(10,2),
  case_price NUMERIC(10,2),
  is_upcharge BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_product_id, size_name)
);

ALTER TABLE public.product_size_pricing ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admin access product_size_pricing" ON public.product_size_pricing
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add pricing_synced_at to master_products to track when pricing was last pulled from S&S
ALTER TABLE public.master_products ADD COLUMN IF NOT EXISTS pricing_synced_at TIMESTAMPTZ;
-- Add pricing_override flag so admins can lock in manual pricing
ALTER TABLE public.master_products ADD COLUMN IF NOT EXISTS pricing_override BOOLEAN NOT NULL DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_product_size_pricing_updated_at
  BEFORE UPDATE ON public.product_size_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
