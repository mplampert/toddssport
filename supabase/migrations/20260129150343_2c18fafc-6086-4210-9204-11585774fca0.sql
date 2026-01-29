-- Create fanwear_leads table for Fanwear page submissions
CREATE TABLE public.fanwear_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT NOT NULL,
  role TEXT NOT NULL,
  sports_or_groups TEXT,
  approximate_size TEXT,
  launch_date TEXT,
  interested_in_fundraising BOOLEAN DEFAULT false,
  additional_info TEXT,
  status TEXT DEFAULT 'new',
  internal_notes TEXT
);

-- Enable RLS
ALTER TABLE public.fanwear_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit leads (public form)
CREATE POLICY "Anyone can submit fanwear leads"
ON public.fanwear_leads
FOR INSERT
WITH CHECK (true);