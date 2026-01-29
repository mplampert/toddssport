-- Create team_store_leads table for Team Store page submissions
CREATE TABLE public.team_store_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT NOT NULL,
  sport TEXT NOT NULL,
  level TEXT NOT NULL,
  number_of_teams TEXT,
  launch_date TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'new',
  internal_notes TEXT
);

-- Enable RLS
ALTER TABLE public.team_store_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit leads (public form)
CREATE POLICY "Anyone can submit team store leads"
ON public.team_store_leads
FOR INSERT
WITH CHECK (true);