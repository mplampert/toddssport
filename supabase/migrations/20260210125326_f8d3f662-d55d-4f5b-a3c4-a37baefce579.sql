ALTER TABLE public.fulfillment_batches ADD COLUMN batch_type TEXT NOT NULL DEFAULT 'scheduled';
COMMENT ON COLUMN public.fulfillment_batches.batch_type IS 'scheduled or manual';