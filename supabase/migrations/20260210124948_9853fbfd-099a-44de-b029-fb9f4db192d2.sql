
-- Fulfillment Batches table
CREATE TABLE public.fulfillment_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_id UUID NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cutoff_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'in_production', 'shipped', 'complete')),
  order_ids UUID[] NOT NULL DEFAULT '{}',
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.fulfillment_batches ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage fulfillment batches"
ON public.fulfillment_batches
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_fulfillment_batches_updated_at
BEFORE UPDATE ON public.fulfillment_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for store lookups
CREATE INDEX idx_fulfillment_batches_store ON public.fulfillment_batches(team_store_id);
CREATE INDEX idx_fulfillment_batches_status ON public.fulfillment_batches(status);
