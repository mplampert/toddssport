ALTER TABLE public.store_logos
ADD COLUMN decoration_type text NOT NULL DEFAULT 'screen_print';

COMMENT ON COLUMN public.store_logos.decoration_type IS 'Decoration method: screen_print, embroidery, tackle_twill, dtf, heat_press, sublimation, other';