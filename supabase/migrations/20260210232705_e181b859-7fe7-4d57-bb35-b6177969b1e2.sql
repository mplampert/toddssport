
-- Add new columns to design_templates
ALTER TABLE public.design_templates
  ADD COLUMN IF NOT EXISTS svg_url_master text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS default_colors jsonb DEFAULT '{"primary": "#C8102E", "secondary": "#000000"}'::jsonb;

-- Create team_art table
CREATE TABLE public.team_art (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_id uuid REFERENCES public.team_stores(id) ON DELETE SET NULL,
  design_template_id uuid REFERENCES public.design_templates(id) ON DELETE SET NULL,
  svg_url_final text,
  school_name text,
  mascot_name text,
  primary_color text,
  secondary_color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_art ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage team art"
  ON public.team_art FOR ALL
  USING (EXISTS (SELECT 1 FROM employee_profiles WHERE employee_profiles.id = auth.uid() AND employee_profiles.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM employee_profiles WHERE employee_profiles.id = auth.uid() AND employee_profiles.is_active = true));

CREATE POLICY "Anyone can view team art"
  ON public.team_art FOR SELECT
  USING (true);

-- Create storage bucket for team art SVGs
INSERT INTO storage.buckets (id, name, public) VALUES ('team-art', 'team-art', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can upload team art files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'team-art' AND EXISTS (SELECT 1 FROM employee_profiles WHERE employee_profiles.id = auth.uid() AND employee_profiles.is_active = true));

CREATE POLICY "Anyone can read team art files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-art');

CREATE POLICY "Staff can update team art files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'team-art' AND EXISTS (SELECT 1 FROM employee_profiles WHERE employee_profiles.id = auth.uid() AND employee_profiles.is_active = true));

CREATE POLICY "Staff can delete team art files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'team-art' AND EXISTS (SELECT 1 FROM employee_profiles WHERE employee_profiles.id = auth.uid() AND employee_profiles.is_active = true));
