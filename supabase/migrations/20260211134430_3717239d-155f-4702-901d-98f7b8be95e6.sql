ALTER TABLE public.design_templates
  ADD COLUMN IF NOT EXISTS supported_fonts jsonb NOT NULL DEFAULT '["Alumni Sans Collegiate One", "Playball"]'::jsonb,
  ADD COLUMN IF NOT EXISTS color_slots jsonb NOT NULL DEFAULT '["primary", "secondary"]'::jsonb;

-- Backfill existing rows
UPDATE public.design_templates
SET supported_fonts = '["Alumni Sans Collegiate One", "Playball"]'::jsonb,
    color_slots = '["primary", "secondary"]'::jsonb
WHERE supported_fonts = '["Alumni Sans Collegiate One", "Playball"]'::jsonb;