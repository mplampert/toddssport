
-- =============================================
-- 1. Admin policies for lead tables (quotes, team_store_leads, fanwear_leads, corporate_leads, promo_leads)
-- =============================================

-- quotes
CREATE POLICY "Admins can read quotes"
  ON public.quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update quotes"
  ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete quotes"
  ON public.quotes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- team_store_leads
CREATE POLICY "Admins can read team_store_leads"
  ON public.team_store_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update team_store_leads"
  ON public.team_store_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete team_store_leads"
  ON public.team_store_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- fanwear_leads
CREATE POLICY "Admins can read fanwear_leads"
  ON public.fanwear_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update fanwear_leads"
  ON public.fanwear_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete fanwear_leads"
  ON public.fanwear_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- corporate_leads
CREATE POLICY "Admins can read corporate_leads"
  ON public.corporate_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update corporate_leads"
  ON public.corporate_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete corporate_leads"
  ON public.corporate_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- promo_leads
CREATE POLICY "Admins can read promo_leads"
  ON public.promo_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update promo_leads"
  ON public.promo_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete promo_leads"
  ON public.promo_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. Fix order items and payments public read policies
-- =============================================

DROP POLICY IF EXISTS "Anyone can read order items" ON public.team_store_order_items;
CREATE POLICY "Restricted read order items"
  ON public.team_store_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_store_orders o
      WHERE o.id = team_store_order_items.order_id
        AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Anyone can read payments" ON public.team_store_payments;
CREATE POLICY "Restricted read payments"
  ON public.team_store_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_store_orders o
      WHERE o.id = team_store_payments.order_id
        AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- =============================================
-- 3. Remove store_pin from SECURITY DEFINER functions
-- =============================================

CREATE OR REPLACE FUNCTION public.get_store_for_preview(_slug text, _token text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT row_to_json(t) FROM (
    SELECT id, name, slug, start_date, end_date, logo_url, primary_color, secondary_color,
           status, active, description, hero_title, hero_subtitle,
           fundraising_percent, store_type
    FROM public.team_stores
    WHERE slug = _slug
      AND preview_token = _token
      AND status IN ('draft', 'open', 'scheduled')
  ) t;
$function$;

-- =============================================
-- 4. Restrict client INSERT on team_store_payments (only service role / admins)
-- =============================================

DROP POLICY IF EXISTS "Anyone can insert payments" ON public.team_store_payments;
-- The existing "Admins can manage payments" policy covers admin INSERT.
-- No public INSERT policy = deny by default via RLS.
