-- Create uniform_cards table for dynamic uniform sport cards
CREATE TABLE public.uniform_cards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subtitle TEXT,
    description TEXT NOT NULL,
    image_url TEXT,
    icon TEXT,
    cta_text TEXT DEFAULT 'View Uniform Options',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    featured_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uniform_cards ENABLE ROW LEVEL SECURITY;

-- Anyone can read active uniform cards
CREATE POLICY "Anyone can read active uniform cards"
ON public.uniform_cards
FOR SELECT
USING (is_active = true);

-- Admins can read all uniform cards
CREATE POLICY "Admins can read all uniform cards"
ON public.uniform_cards
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert uniform cards
CREATE POLICY "Admins can insert uniform cards"
ON public.uniform_cards
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update uniform cards
CREATE POLICY "Admins can update uniform cards"
ON public.uniform_cards
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete uniform cards
CREATE POLICY "Admins can delete uniform cards"
ON public.uniform_cards
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_uniform_cards_updated_at
BEFORE UPDATE ON public.uniform_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial data from the existing sports
INSERT INTO public.uniform_cards (title, slug, subtitle, description, image_url, icon, sort_order, is_active, is_featured, featured_label) VALUES
('Hockey', 'hockey', NULL, 'Custom jerseys, socks, and practice gear for ice and roller hockey teams.', '/uniforms/hockey-uniforms.jpg', '🏒', 1, true, false, NULL),
('Baseball', 'baseball', NULL, 'Full-button jerseys, pants, caps, and warm-ups for youth through adult leagues.', '/uniforms/baseball-uniforms.jpg', '⚾', 2, true, true, 'Spring Baseball'),
('Lacrosse', 'lacrosse', NULL, 'Game-day reversibles, shooting shirts, shorts, and pinnies built for speed.', '/uniforms/lacrosse-uniforms.jpg', '🥍', 3, true, true, 'Spring Lacrosse'),
('Basketball', 'basketball', NULL, 'Sublimated or sewn jerseys, shorts, and warm-up gear for all levels.', '/uniforms/basketball-uniforms.jpg', '🏀', 4, true, false, NULL),
('Football', 'football', NULL, 'Jerseys, practice gear, sideline apparel, and fan wear for your program.', '/uniforms/football-uniforms.jpg', '🏈', 5, true, false, NULL),
('Soccer', 'soccer', NULL, 'Lightweight jerseys, shorts, training gear, and keeper kits.', '/uniforms/soccer-uniforms.jpg', '⚽', 6, true, false, NULL),
('Track & Field', 'track-field', NULL, 'Singlets, shorts, warm-ups, and team bags for sprinters to throwers.', '/uniforms/track-uniforms.jpg', '🏃', 7, true, true, 'Spring Track'),
('Softball', 'softball', NULL, 'Jerseys, pants, and accessories designed for fast-pitch and slow-pitch teams.', '/uniforms/softball-uniforms.jpg', '🥎', 8, true, false, NULL),
('Volleyball', 'volleyball', NULL, 'Jerseys, spandex, and warm-ups for indoor and sand volleyball teams.', '/uniforms/volleyball-uniforms.jpg', '🏐', 9, true, false, NULL),
('Wrestling', 'wrestling', NULL, 'Custom singlets, warm-ups, and team gear for grapplers at every level.', '/uniforms/wrestling-uniforms.jpg', '🤼', 10, true, false, NULL),
('Swimming', 'swimming', NULL, 'Team swimsuits, jammers, caps, and warm-up gear for competitive swim teams.', '/uniforms/swimming-uniforms.jpg', '🏊', 11, true, false, NULL),
('Tennis', 'tennis', NULL, 'Polo shirts, skirts, shorts, and team warm-ups for courts and clubs.', '/uniforms/tennis-uniforms.jpg', '🎾', 12, true, false, NULL),
('Cheerleading', 'cheerleading', NULL, 'Custom shells, skirts, bodysuits, and spirit wear for cheer and dance teams.', '/uniforms/cheerleading-uniforms.jpg', '📣', 13, true, false, NULL),
('Golf', 'golf', NULL, 'Performance polos, pants, and outerwear for high school and club golf teams.', '/uniforms/golf-uniforms.jpg', '⛳', 14, true, false, NULL);