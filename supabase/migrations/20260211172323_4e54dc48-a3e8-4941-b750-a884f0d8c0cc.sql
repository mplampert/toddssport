
-- Table to track bulk S&S import jobs with per-brand progress
CREATE TABLE public.ss_import_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending',          -- pending | running | completed | failed
  brands_requested text[] NOT NULL DEFAULT '{}',   -- brand names to import
  current_brand text,                              -- brand currently being imported
  brands_completed int NOT NULL DEFAULT 0,
  brands_total int NOT NULL DEFAULT 0,
  products_imported int NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,          -- [{brand, fetched, written, error?}]
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ss_import_jobs ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin users can access
CREATE POLICY "Admin read import jobs" ON public.ss_import_jobs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert import jobs" ON public.ss_import_jobs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can update import jobs" ON public.ss_import_jobs
  FOR UPDATE USING (true);

CREATE TRIGGER update_ss_import_jobs_updated_at
  BEFORE UPDATE ON public.ss_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for progress polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.ss_import_jobs;
