
-- Create team_rosters table
CREATE TABLE public.team_rosters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.team_stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season TEXT,
  sport TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team rosters"
  ON public.team_rosters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read team rosters for open stores"
  ON public.team_rosters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_stores ts
    WHERE ts.id = team_rosters.store_id AND ts.status = 'open'
  ));

-- Create player status enum
CREATE TYPE public.roster_player_status AS ENUM ('active', 'inactive');

-- Create number lock rule enum
CREATE TYPE public.number_lock_rule AS ENUM ('none', 'lock_on_first_order');

-- Create team_roster_players table
CREATE TABLE public.team_roster_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_roster_id UUID NOT NULL REFERENCES public.team_rosters(id) ON DELETE CASCADE,
  player_first_name TEXT NOT NULL,
  player_last_name TEXT NOT NULL,
  jersey_number TEXT NOT NULL,
  status public.roster_player_status NOT NULL DEFAULT 'active',
  grad_year INTEGER,
  birth_year INTEGER,
  position TEXT,
  player_email TEXT,
  player_phone TEXT,
  guardian_name TEXT,
  guardian_email TEXT,
  notes TEXT,
  claimed_order_item_id UUID,
  claimed_at TIMESTAMP WITH TIME ZONE,
  claimed_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_roster_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roster players"
  ON public.team_roster_players FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active roster players for open stores"
  ON public.team_roster_players FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_rosters tr
    JOIN public.team_stores ts ON ts.id = tr.store_id
    WHERE tr.id = team_roster_players.team_roster_id AND ts.status = 'open'
  ));

-- Add roster columns to team_store_products
ALTER TABLE public.team_store_products
  ADD COLUMN team_roster_id UUID REFERENCES public.team_rosters(id) ON DELETE SET NULL,
  ADD COLUMN number_lock_rule public.number_lock_rule NOT NULL DEFAULT 'none';

-- Add roster player reference to order items
ALTER TABLE public.team_store_order_items
  ADD COLUMN team_roster_player_id UUID REFERENCES public.team_roster_players(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_team_rosters_store_id ON public.team_rosters(store_id);
CREATE INDEX idx_team_roster_players_roster_id ON public.team_roster_players(team_roster_id);
CREATE INDEX idx_team_store_products_roster_id ON public.team_store_products(team_roster_id);

-- Timestamp trigger for team_rosters
CREATE TRIGGER update_team_rosters_updated_at
  BEFORE UPDATE ON public.team_rosters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Timestamp trigger for team_roster_players
CREATE TRIGGER update_team_roster_players_updated_at
  BEFORE UPDATE ON public.team_roster_players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
