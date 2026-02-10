
-- Table to store per-store custom fees
CREATE TABLE public.team_store_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  fee_name TEXT NOT NULL DEFAULT 'Processing fee',
  fee_type TEXT NOT NULL DEFAULT 'flat' CHECK (fee_type IN ('flat', 'percent')),
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_store_fees ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access to team_store_fees"
  ON public.team_store_fees FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read for active fees (needed at checkout)
CREATE POLICY "Public can read active fees"
  ON public.team_store_fees FOR SELECT
  USING (active = true);

-- Add fees columns to team_store_orders
ALTER TABLE public.team_store_orders
  ADD COLUMN fees_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN fees_total NUMERIC NOT NULL DEFAULT 0;

-- Trigger for updated_at
CREATE TRIGGER update_team_store_fees_updated_at
  BEFORE UPDATE ON public.team_store_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
