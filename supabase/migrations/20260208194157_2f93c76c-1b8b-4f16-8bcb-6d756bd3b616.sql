
-- Create team_store_messages table
CREATE TABLE public.team_store_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_store_id UUID NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  location TEXT NOT NULL DEFAULT 'home' CHECK (location IN ('home', 'product', 'checkout', 'global')),
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  style_variant TEXT NOT NULL DEFAULT 'info' CHECK (style_variant IN ('info', 'warning', 'danger', 'success')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_team_store_messages_store_location ON public.team_store_messages(team_store_id, location);

-- RLS
ALTER TABLE public.team_store_messages ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (authenticated users with admin role)
CREATE POLICY "Admins can manage store messages"
  ON public.team_store_messages
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Public can read active messages
CREATE POLICY "Anyone can read active store messages"
  ON public.team_store_messages
  FOR SELECT
  USING (is_active = true);

-- Timestamp trigger
CREATE TRIGGER update_team_store_messages_updated_at
  BEFORE UPDATE ON public.team_store_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
