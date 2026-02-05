
-- Add admin-only read access for fanwear_leads
CREATE POLICY "Admins can read fanwear leads"
ON public.fanwear_leads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin-only update/delete for completeness
CREATE POLICY "Admins can update fanwear leads"
ON public.fanwear_leads
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete fanwear leads"
ON public.fanwear_leads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
