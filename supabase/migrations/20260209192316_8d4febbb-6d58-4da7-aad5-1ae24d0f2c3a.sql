
-- Text decoration layers for team store products (name, number, static text)
CREATE TABLE public.team_store_item_text_layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_item_id UUID NOT NULL REFERENCES public.team_store_products(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'static_text',
  -- source values: static_text, personalization_name, personalization_number, name_number_template, personalization_custom_field
  view TEXT NOT NULL DEFAULT 'front',
  -- view values: front, back, left_sleeve, right_sleeve

  -- Position & transform
  x NUMERIC NOT NULL DEFAULT 0.5,
  y NUMERIC NOT NULL DEFAULT 0.5,
  scale NUMERIC NOT NULL DEFAULT 0.15,
  rotation NUMERIC NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 10,

  -- Text content
  static_text TEXT,
  text_pattern TEXT,
  custom_field_id TEXT,

  -- Styling
  font_family TEXT NOT NULL DEFAULT 'Arial',
  font_weight TEXT NOT NULL DEFAULT 'bold',
  font_size_px INTEGER NOT NULL DEFAULT 48,
  text_transform TEXT NOT NULL DEFAULT 'uppercase',
  fill_color TEXT NOT NULL DEFAULT '#FFFFFF',
  outline_color TEXT DEFAULT '#000000',
  outline_thickness NUMERIC NOT NULL DEFAULT 0,
  letter_spacing NUMERIC NOT NULL DEFAULT 0,
  line_height NUMERIC NOT NULL DEFAULT 1.2,
  alignment TEXT NOT NULL DEFAULT 'center',

  -- Scope
  variant_color TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_text_layers_item ON public.team_store_item_text_layers(team_store_item_id);

-- RLS
ALTER TABLE public.team_store_item_text_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage text layers"
  ON public.team_store_item_text_layers
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Text layers are publicly readable"
  ON public.team_store_item_text_layers
  FOR SELECT
  USING (true);

-- Timestamp trigger
CREATE TRIGGER update_text_layers_updated_at
  BEFORE UPDATE ON public.team_store_item_text_layers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
