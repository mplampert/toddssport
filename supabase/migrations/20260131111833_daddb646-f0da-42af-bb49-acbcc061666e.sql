-- Create champro_products table (one row per Champro style we sell)
CREATE TABLE public.champro_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_master TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  moq_custom INTEGER NOT NULL DEFAULT 12,
  default_lead_time_name TEXT DEFAULT 'JUICE Standard',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create champro_wholesale table (wholesale costs per product)
CREATE TABLE public.champro_wholesale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  champro_product_id UUID NOT NULL REFERENCES public.champro_products(id) ON DELETE CASCADE,
  base_cost_per_unit DECIMAL(10, 2) NOT NULL,
  express_upcharge_cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  express_plus_upcharge_cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(champro_product_id)
);

-- Create champro_pricing_rules table (markup percentages)
CREATE TABLE public.champro_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  champro_product_id UUID NOT NULL REFERENCES public.champro_products(id) ON DELETE CASCADE,
  markup_percent DECIMAL(5, 2) NOT NULL DEFAULT 50,
  rush_markup_percent DECIMAL(5, 2) DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(champro_product_id)
);

-- Enable RLS on all tables
ALTER TABLE public.champro_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.champro_wholesale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.champro_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Public read access for products (needed for checkout)
CREATE POLICY "Anyone can read champro products"
ON public.champro_products FOR SELECT
USING (true);

CREATE POLICY "Anyone can read champro wholesale"
ON public.champro_wholesale FOR SELECT
USING (true);

CREATE POLICY "Anyone can read champro pricing rules"
ON public.champro_pricing_rules FOR SELECT
USING (true);

-- Admin write access
CREATE POLICY "Admins can manage champro products"
ON public.champro_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage champro wholesale"
ON public.champro_wholesale FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage champro pricing rules"
ON public.champro_pricing_rules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_champro_products_updated_at
BEFORE UPDATE ON public.champro_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_champro_wholesale_updated_at
BEFORE UPDATE ON public.champro_wholesale
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_champro_pricing_rules_updated_at
BEFORE UPDATE ON public.champro_pricing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample data for hockey uniforms
INSERT INTO public.champro_products (product_master, name, sport, moq_custom, default_lead_time_name) VALUES
('HOCKEY-JERSEY-CUSTOM', 'Custom Hockey Jersey', 'hockey', 12, 'JUICE Standard'),
('HOCKEY-PANT-CUSTOM', 'Custom Hockey Pant', 'hockey', 12, 'JUICE Standard'),
('BASEBALL-JERSEY-CUSTOM', 'Custom Baseball Jersey', 'baseball', 12, 'JUICE Standard'),
('SOFTBALL-JERSEY-CUSTOM', 'Custom Softball Jersey', 'softball', 12, 'JUICE Standard'),
('BASKETBALL-JERSEY-CUSTOM', 'Custom Basketball Jersey', 'basketball', 12, 'JUICE Standard'),
('FOOTBALL-JERSEY-CUSTOM', 'Custom Football Jersey', 'football', 12, 'JUICE Standard'),
('SOCCER-JERSEY-CUSTOM', 'Custom Soccer Jersey', 'soccer', 12, 'JUICE Standard'),
('VOLLEYBALL-JERSEY-CUSTOM', 'Custom Volleyball Jersey', 'volleyball', 12, 'JUICE Standard'),
('LACROSSE-JERSEY-CUSTOM', 'Custom Lacrosse Jersey', 'lacrosse', 12, 'JUICE Standard'),
('WRESTLING-SINGLET-CUSTOM', 'Custom Wrestling Singlet', 'wrestling', 12, 'JUICE Standard'),
('TRACK-JERSEY-CUSTOM', 'Custom Track Jersey', 'track-field', 12, 'JUICE Standard');

-- Seed wholesale costs (example values - adjust as needed)
INSERT INTO public.champro_wholesale (champro_product_id, base_cost_per_unit, express_upcharge_cost_per_unit, express_plus_upcharge_cost_per_unit)
SELECT id, 35.00, 8.00, 15.00 FROM public.champro_products WHERE sport = 'hockey';

INSERT INTO public.champro_wholesale (champro_product_id, base_cost_per_unit, express_upcharge_cost_per_unit, express_plus_upcharge_cost_per_unit)
SELECT id, 28.00, 6.00, 12.00 FROM public.champro_products WHERE sport IN ('baseball', 'softball');

INSERT INTO public.champro_wholesale (champro_product_id, base_cost_per_unit, express_upcharge_cost_per_unit, express_plus_upcharge_cost_per_unit)
SELECT id, 25.00, 5.00, 10.00 FROM public.champro_products WHERE sport IN ('basketball', 'volleyball');

INSERT INTO public.champro_wholesale (champro_product_id, base_cost_per_unit, express_upcharge_cost_per_unit, express_plus_upcharge_cost_per_unit)
SELECT id, 32.00, 7.00, 14.00 FROM public.champro_products WHERE sport = 'football';

INSERT INTO public.champro_wholesale (champro_product_id, base_cost_per_unit, express_upcharge_cost_per_unit, express_plus_upcharge_cost_per_unit)
SELECT id, 26.00, 5.00, 10.00 FROM public.champro_products WHERE sport IN ('soccer', 'lacrosse', 'track-field');

INSERT INTO public.champro_wholesale (champro_product_id, base_cost_per_unit, express_upcharge_cost_per_unit, express_plus_upcharge_cost_per_unit)
SELECT id, 38.00, 8.00, 16.00 FROM public.champro_products WHERE sport = 'wrestling';

-- Seed pricing rules (50% markup default)
INSERT INTO public.champro_pricing_rules (champro_product_id, markup_percent, rush_markup_percent)
SELECT id, 50.00, 50.00 FROM public.champro_products;