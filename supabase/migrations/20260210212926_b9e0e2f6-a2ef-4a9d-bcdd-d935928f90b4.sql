
-- Design templates for the Design Library (BSN-style fanwear designs)
CREATE TABLE public.design_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  sport TEXT NOT NULL DEFAULT 'general',
  category TEXT NOT NULL DEFAULT 'classic',
  name TEXT NOT NULL,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast category filtering
CREATE INDEX idx_design_templates_category ON public.design_templates (category) WHERE active = true;
CREATE INDEX idx_design_templates_sport ON public.design_templates (sport) WHERE active = true;

-- Enable RLS
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

-- Public read for active designs
CREATE POLICY "Anyone can view active designs"
  ON public.design_templates FOR SELECT
  USING (active = true);

-- Admin full access (employees)
CREATE POLICY "Staff can manage designs"
  ON public.design_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.employee_profiles WHERE id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employee_profiles WHERE id = auth.uid() AND is_active = true)
  );

-- Timestamp trigger
CREATE TRIGGER update_design_templates_updated_at
  BEFORE UPDATE ON public.design_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
