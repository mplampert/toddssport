-- Create flyers table
CREATE TABLE public.flyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  subtitle TEXT,
  bullet_points TEXT[] DEFAULT '{}',
  price_line TEXT,
  fundraising_line TEXT,
  image_url TEXT,
  notes_cta TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage flyers"
ON public.flyers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_flyers_updated_at
BEFORE UPDATE ON public.flyers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for flyer PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('flyers', 'flyers', true);

-- Storage policies for flyer PDFs
CREATE POLICY "Anyone can read flyer PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'flyers');

CREATE POLICY "Admins can upload flyer PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'flyers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update flyer PDFs"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'flyers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete flyer PDFs"
ON storage.objects
FOR DELETE
USING (bucket_id = 'flyers' AND auth.uid() IS NOT NULL);