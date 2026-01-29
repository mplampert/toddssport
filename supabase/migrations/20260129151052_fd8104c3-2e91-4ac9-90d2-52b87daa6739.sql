-- Create a table for corporate leads
CREATE TABLE public.corporate_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT NOT NULL,
  industry TEXT,
  number_of_employees TEXT,
  interested_in_apparel BOOLEAN DEFAULT false,
  interested_in_promo_products BOOLEAN DEFAULT false,
  interested_in_web_store BOOLEAN DEFAULT false,
  interested_in_fulfillment BOOLEAN DEFAULT false,
  target_date TEXT,
  budget_range TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'new',
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.corporate_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for public form submissions
CREATE POLICY "Anyone can submit corporate leads"
ON public.corporate_leads
FOR INSERT
WITH CHECK (true);