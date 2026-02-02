-- Create reps table for sales representatives
CREATE TABLE public.reps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  territory_type TEXT NOT NULL,
  territory_value TEXT NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reps ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Anyone can read active reps (for public search)
CREATE POLICY "Anyone can read active reps" 
ON public.reps 
FOR SELECT 
USING (active = true);

-- Admins can read all reps (including inactive)
CREATE POLICY "Admins can read all reps" 
ON public.reps 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert reps
CREATE POLICY "Admins can insert reps" 
ON public.reps 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update reps
CREATE POLICY "Admins can update reps" 
ON public.reps 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete reps
CREATE POLICY "Admins can delete reps" 
ON public.reps 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reps_updated_at
BEFORE UPDATE ON public.reps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster territory searches
CREATE INDEX idx_reps_territory_value ON public.reps USING gin(to_tsvector('english', territory_value));
CREATE INDEX idx_reps_active ON public.reps(active);

-- Insert sample data
INSERT INTO public.reps (name, email, phone, territory_type, territory_value, notes, active) VALUES
('Mike Johnson', 'mike@toddssport.com', '(555) 123-4567', 'school', 'Lincoln High School', 'Primary contact for all Lincoln athletics', true),
('Sarah Williams', 'sarah@toddssport.com', '(555) 234-5678', 'city', 'Springfield', 'Covers all schools in Springfield area', true),
('Tom Rodriguez', 'tom@toddssport.com', '(555) 345-6789', 'zip', '62701', 'Downtown Springfield zip code', true),
('Emily Chen', 'emily@toddssport.com', '(555) 456-7890', 'league', 'Central Illinois Conference', 'All CIC member schools', true),
('David Martinez', 'david@toddssport.com', '(555) 567-8901', 'school', 'Jefferson Middle School', 'Youth and middle school specialist', true),
('Jessica Brown', 'jessica@toddssport.com', '(555) 678-9012', 'city', 'Decatur', 'Decatur and surrounding areas', true),
('Chris Taylor', 'chris@toddssport.com', '(555) 789-0123', 'zip', '61801', 'Champaign-Urbana area', true),
('Amanda Wilson', 'amanda@toddssport.com', '(555) 890-1234', 'league', 'Big 12 Conference', 'College athletic programs', true);