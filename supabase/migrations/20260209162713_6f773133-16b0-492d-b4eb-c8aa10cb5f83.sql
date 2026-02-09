
-- ═══════════════════════════════════════════════════════════════
-- A) Promo Codes + Redemptions tables
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.team_store_promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'amount')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_redemptions_total INTEGER,
  max_redemptions_per_email INTEGER NOT NULL DEFAULT 1,
  allowed_emails JSONB DEFAULT '[]'::jsonb,
  allowed_email_domains JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);

ALTER TABLE public.team_store_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes"
  ON public.team_store_promo_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active promo codes"
  ON public.team_store_promo_codes FOR SELECT
  USING (active = true);

CREATE TABLE public.team_store_promo_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.team_store_promo_codes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.team_store_orders(id) ON DELETE CASCADE,
  purchaser_email TEXT NOT NULL,
  discount_snapshot NUMERIC NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_store_promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo redemptions"
  ON public.team_store_promo_redemptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create promo redemptions"
  ON public.team_store_promo_redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read promo redemptions"
  ON public.team_store_promo_redemptions FOR SELECT
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- B+C+D) Add billing, recipient, fulfillment, promo snapshot columns to orders
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.team_store_orders
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS recipient_sms_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_location_id TEXT,
  ADD COLUMN IF NOT EXISTS pickup_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS promo_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS billing_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS recipient_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS fulfillment_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.team_store_promo_codes(id);

-- Trigger for updated_at on promo_codes
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.team_store_promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
