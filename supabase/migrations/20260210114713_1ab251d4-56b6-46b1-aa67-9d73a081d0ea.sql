
-- Table for recording fundraising payouts to organizations
CREATE TABLE public.fundraising_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_id UUID NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fundraising_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fundraising payouts"
  ON public.fundraising_payouts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_fundraising_payouts_store ON public.fundraising_payouts(team_store_id);
