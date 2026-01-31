-- Create champro_pricing_settings table for global and sport-level defaults
CREATE TABLE public.champro_pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'sport')),
  sport TEXT, -- required when scope = 'sport'
  markup_percent NUMERIC NOT NULL DEFAULT 50,
  rush_markup_percent NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_scope_sport UNIQUE (scope, sport),
  CONSTRAINT valid_sport_for_scope CHECK (
    (scope = 'global' AND sport IS NULL) OR
    (scope = 'sport' AND sport IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.champro_pricing_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage champro pricing settings"
ON public.champro_pricing_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read champro pricing settings"
ON public.champro_pricing_settings
FOR SELECT
USING (true);

-- Seed global default
INSERT INTO public.champro_pricing_settings (scope, sport, markup_percent, rush_markup_percent)
VALUES ('global', NULL, 50, 50);

-- Add sku column to champro_products
ALTER TABLE public.champro_products ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;

-- Create index for sport lookups
CREATE INDEX idx_champro_pricing_settings_sport ON public.champro_pricing_settings(scope, sport);

-- Add trigger for updated_at
CREATE TRIGGER update_champro_pricing_settings_updated_at
BEFORE UPDATE ON public.champro_pricing_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();