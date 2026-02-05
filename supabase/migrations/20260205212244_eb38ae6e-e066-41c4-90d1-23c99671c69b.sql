
-- Team stores table
CREATE TABLE public.team_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  start_date date,
  end_date date,
  logo_url text,
  primary_color text DEFAULT '#000000',
  secondary_color text DEFAULT '#ffffff',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team stores"
ON public.team_stores FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Junction table: team_store <-> catalog_styles
CREATE TABLE public.team_store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_store_id uuid NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  style_id integer NOT NULL REFERENCES public.catalog_styles(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_store_id, style_id)
);

ALTER TABLE public.team_store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team store products"
ON public.team_store_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on team_stores
CREATE TRIGGER update_team_stores_updated_at
BEFORE UPDATE ON public.team_stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
