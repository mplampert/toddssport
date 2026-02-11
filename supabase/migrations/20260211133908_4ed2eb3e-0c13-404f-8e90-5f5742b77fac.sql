ALTER TABLE public.design_templates
  ADD COLUMN IF NOT EXISTS school_font text NOT NULL DEFAULT 'Alumni Sans Collegiate One',
  ADD COLUMN IF NOT EXISTS mascot_font text NOT NULL DEFAULT 'Playball';