
-- Create product_inquiries table for public catalog inquiry form
CREATE TABLE public.product_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- contact info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  phone TEXT,
  -- product info
  product_style_id INTEGER,
  product_brand TEXT,
  product_style_code TEXT,
  product_name TEXT,
  product_color TEXT,
  -- request details
  quantity_estimate TEXT,
  decoration_type TEXT,
  notes TEXT,
  -- for future "add to store request"
  team_store_id UUID REFERENCES public.team_stores(id),
  -- admin
  status TEXT NOT NULL DEFAULT 'new',
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (public form)
CREATE POLICY "Anyone can submit product inquiries"
  ON public.product_inquiries FOR INSERT
  WITH CHECK (true);

-- Only admins can read/update/delete
CREATE POLICY "Admins can manage product inquiries"
  ON public.product_inquiries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
