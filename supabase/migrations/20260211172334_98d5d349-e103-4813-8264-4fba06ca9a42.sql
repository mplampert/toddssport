
-- Tighten the UPDATE policy: only service role (via edge function) should update
DROP POLICY "Service role can update import jobs" ON public.ss_import_jobs;

-- Allow update only for admin users (edge function uses service role which bypasses RLS anyway)
CREATE POLICY "Admin update import jobs" ON public.ss_import_jobs
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
