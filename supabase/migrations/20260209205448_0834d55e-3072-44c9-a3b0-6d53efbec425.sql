ALTER TABLE public.team_store_personalization_defaults
ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;