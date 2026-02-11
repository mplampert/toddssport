-- Allow admins to update brands (for show_in_catalog toggle)
CREATE POLICY "Admins can manage brands"
ON public.brands
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));