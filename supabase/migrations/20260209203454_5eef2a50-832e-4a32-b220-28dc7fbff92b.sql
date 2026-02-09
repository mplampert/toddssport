-- Size charts table
CREATE TABLE public.size_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  brand text,
  category text,
  content_type text NOT NULL DEFAULT 'html' CHECK (content_type IN ('html', 'image', 'pdf')),
  content_html text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.size_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage size charts"
  ON public.size_charts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read size charts"
  ON public.size_charts FOR SELECT
  USING (true);

-- Add override columns to team_store_products
ALTER TABLE public.team_store_products
  ADD COLUMN IF NOT EXISTS description_override text,
  ADD COLUMN IF NOT EXISTS short_description_override text,
  ADD COLUMN IF NOT EXISTS size_chart_override_id uuid REFERENCES public.size_charts(id),
  ADD COLUMN IF NOT EXISTS size_chart_display_mode text NOT NULL DEFAULT 'popup' CHECK (size_chart_display_mode IN ('tab', 'popup', 'inline'));