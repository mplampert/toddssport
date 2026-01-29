-- Create site_settings table for CMS content
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  long_description TEXT,
  icon TEXT,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create who_we_serve table
CREATE TABLE public.who_we_serve (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create brands table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  quote TEXT NOT NULL,
  logo_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create quotes table for lead handling
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  needs_uniforms BOOLEAN DEFAULT false,
  needs_spirit_wear BOOLEAN DEFAULT false,
  needs_corporate_apparel BOOLEAN DEFAULT false,
  needs_promotional_products BOOLEAN DEFAULT false,
  needs_other BOOLEAN DEFAULT false,
  estimated_quantity TEXT,
  deadline TEXT,
  extra_details TEXT,
  logo_file_url TEXT,
  status TEXT DEFAULT 'new',
  internal_notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.who_we_serve ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Public read access for CMS content tables (marketing site needs to read these)
CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Anyone can read who_we_serve" ON public.who_we_serve FOR SELECT USING (true);
CREATE POLICY "Anyone can read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Anyone can read testimonials" ON public.testimonials FOR SELECT USING (true);

-- Allow anyone to submit quotes (lead form)
CREATE POLICY "Anyone can submit quotes" ON public.quotes FOR INSERT WITH CHECK (true);

-- Create storage bucket for logo uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-logos', 'quote-logos', true);

-- Storage policy for public uploads
CREATE POLICY "Anyone can upload quote logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quote-logos');
CREATE POLICY "Anyone can view quote logos" ON storage.objects FOR SELECT USING (bucket_id = 'quote-logos');

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_headline', 'Todd''s Sporting Goods – Custom Screen Printing, Embroidery & Team Uniforms'),
  ('hero_subheadline', 'Full-service decoration for schools, leagues, and businesses. From team uniforms and spirit wear to branded promo products, Todd''s Sporting Goods makes your organization look professional on and off the field.'),
  ('phone', '(555) 123-4567'),
  ('email', 'info@toddssportinggoods.com'),
  ('address', '123 Main Street, Hometown, USA 12345'),
  ('quotes_email', 'quotes@toddssportinggoods.com'),
  ('from_email', 'noreply@toddssportinggoods.com');

-- Insert default services
INSERT INTO public.services (slug, name, short_description, long_description, icon, order_index) VALUES
  ('screen-printing', 'Screen Printing', 'High-quality screen printing for teams, events, and businesses. Vibrant colors that last.', 'Our state-of-the-art screen printing facility produces vibrant, long-lasting prints on a wide variety of garments. Whether you need 50 or 5,000 pieces, we deliver consistent quality with fast turnaround times. Perfect for team uniforms, event shirts, corporate apparel, and promotional merchandise.', 'Printer', 1),
  ('embroidery', 'Embroidery', 'Professional embroidery for a polished, premium look on polos, caps, and jackets.', 'Add a touch of professionalism with our precision embroidery services. Ideal for corporate logos, team crests, and personalized names. Our multi-head embroidery machines ensure consistent quality across every piece, from individual items to large orders.', 'Scissors', 2),
  ('team-uniforms', 'Team Uniform Packages', 'Complete uniform solutions for youth leagues, high schools, and adult teams.', 'Get your entire team outfitted with our comprehensive uniform packages. We offer jerseys, shorts, warm-ups, bags, and accessories from top brands. Our team experts help you design cohesive looks that build team identity and pride.', 'Users', 3),
  ('promotional-products', 'Promotional Products', 'Branded merchandise, giveaways, and promotional items to boost your brand.', 'Extend your brand beyond apparel with our extensive promotional products catalog. From drinkware and bags to tech accessories and awards, we help you find the perfect items for events, giveaways, and corporate gifts.', 'Gift', 4);

-- Insert who we serve
INSERT INTO public.who_we_serve (title, description, icon, order_index) VALUES
  ('Youth & Town Sports Leagues', 'Complete uniform and spirit wear solutions for recreational and competitive youth sports programs.', 'Trophy', 1),
  ('High Schools & Colleges', 'Athletic uniforms, fan gear, and branded apparel for educational institutions of all sizes.', 'GraduationCap', 2),
  ('Businesses & Corporate Teams', 'Professional branded apparel for company teams, events, and employee uniforms.', 'Briefcase', 3),
  ('Events, Camps & Fundraisers', 'Custom merchandise for camps, tournaments, charity events, and fundraising initiatives.', 'Calendar', 4);

-- Insert brands
INSERT INTO public.brands (name, logo_url, order_index) VALUES
  ('Nike', NULL, 1),
  ('Under Armour', NULL, 2),
  ('Adidas', NULL, 3),
  ('Russell Athletic', NULL, 4),
  ('Augusta Sportswear', NULL, 5),
  ('Badger Sport', NULL, 6);

-- Insert testimonials
INSERT INTO public.testimonials (name, role, quote, order_index) VALUES
  ('Mike Johnson', 'Athletic Director, Central High School', 'Todd''s has been our go-to for team uniforms for over 10 years. Their quality and service are unmatched.', 1),
  ('Sarah Williams', 'President, Hometown Youth Soccer', 'They made outfitting our entire league simple and affordable. The kids love their new jerseys!', 2),
  ('Tom Richardson', 'Owner, Richardson Plumbing', 'Professional embroidered polos and jackets that make our team look sharp on every job site.', 3);