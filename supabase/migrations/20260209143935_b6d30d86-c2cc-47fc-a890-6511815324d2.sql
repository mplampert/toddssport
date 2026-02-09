
-- Global decoration placement presets based on Stahls' Design Size & Placement Guide
CREATE TABLE public.decoration_placements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  garment_type text NOT NULL DEFAULT 'apparel',  -- apparel, hat, bag
  max_width_in numeric NOT NULL,
  max_height_in numeric NOT NULL,
  default_x numeric NOT NULL DEFAULT 0.5,
  default_y numeric NOT NULL DEFAULT 0.3,
  default_scale numeric NOT NULL DEFAULT 0.2,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decoration_placements ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage decoration placements"
ON public.decoration_placements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public read
CREATE POLICY "Anyone can read decoration placements"
ON public.decoration_placements FOR SELECT
USING (is_active = true);

-- Seed: Apparel placements (from Stahls T-Shirt Quick Guide, page 26)
INSERT INTO public.decoration_placements (code, label, garment_type, max_width_in, max_height_in, default_x, default_y, default_scale, sort_order) VALUES
  ('left_chest',        'Left Chest',        'apparel',  5,    5,    0.35, 0.25, 0.15, 10),
  ('right_chest',       'Right Chest',       'apparel',  5,    5,    0.65, 0.25, 0.15, 20),
  ('center_chest',      'Center Chest',      'apparel',  5,    5,    0.50, 0.25, 0.15, 30),
  ('medium_front',      'Medium Front',      'apparel',  8,    8,    0.50, 0.35, 0.25, 40),
  ('full_front',        'Full Front',        'apparel', 12,   14,    0.50, 0.40, 0.40, 50),
  ('across_chest',      'Across Chest',      'apparel',  4,   12,    0.50, 0.22, 0.35, 60),
  ('across_shoulders',  'Across Shoulders',  'apparel',  4,   14,    0.50, 0.12, 0.40, 70),
  ('left_sleeve',       'Left Sleeve',       'apparel',  3.5,  3.5,  0.12, 0.30, 0.10, 80),
  ('right_sleeve',      'Right Sleeve',      'apparel',  3.5,  3.5,  0.88, 0.30, 0.10, 90),
  ('medium_back',       'Medium Back',       'apparel',  8,    8,    0.50, 0.35, 0.25, 100),
  ('full_back',         'Full Back',         'apparel', 12,   14,    0.50, 0.40, 0.40, 110),
  ('locker_patch',      'Locker Patch',      'apparel',  4,    4,    0.50, 0.70, 0.12, 120),
  ('front_bottom_left', 'Front Bottom Left', 'apparel',  5,    6,    0.35, 0.72, 0.15, 130),
  ('front_bottom_right','Front Bottom Right', 'apparel', 5,    6,    0.65, 0.72, 0.15, 140),
  ('left_vertical',     'Left Vertical',     'apparel',  5,   14,    0.35, 0.50, 0.15, 150),
  ('right_vertical',    'Right Vertical',    'apparel',  5,   14,    0.65, 0.50, 0.15, 160),

  -- Hat placements (Stahls Hat Guide, mid-profile as default)
  ('hat_front',  'Hat Front',  'hat',  5,    2,    0.50, 0.35, 0.30, 200),
  ('hat_side',   'Hat Side',   'hat',  2.5,  1,    0.20, 0.40, 0.15, 210),
  ('hat_back',   'Hat Back',   'hat',  2.75, 1,    0.50, 0.55, 0.15, 220),

  -- Bag placements (Stahls Bag Guide)
  ('bag_center',      'Bag Center',      'bag',  5,  5,  0.50, 0.45, 0.25, 300),
  ('bag_duffel',      'Duffel Bag',      'bag', 12,  6,  0.50, 0.45, 0.35, 310),
  ('bag_large',       'Large Bag',       'bag', 10, 10,  0.50, 0.45, 0.30, 320);
