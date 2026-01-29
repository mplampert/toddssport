-- Create a table for promotional products leads
CREATE TABLE public.promo_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT NOT NULL,
  interested_in_branded_merch BOOLEAN DEFAULT false,
  interested_in_employee_gifts BOOLEAN DEFAULT false,
  interested_in_event_kits BOOLEAN DEFAULT false,
  interested_in_company_store BOOLEAN DEFAULT false,
  interested_in_other BOOLEAN DEFAULT false,
  quantity_and_budget TEXT,
  target_date TEXT,
  project_details TEXT,
  status TEXT DEFAULT 'new',
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.promo_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for public form submissions
CREATE POLICY "Anyone can submit promo leads"
ON public.promo_leads
FOR INSERT
WITH CHECK (true);