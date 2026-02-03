-- Add sales rep reference to flyers table
ALTER TABLE public.flyers 
ADD COLUMN rep_id UUID REFERENCES public.reps(id);