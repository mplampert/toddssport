-- Allow store_logos to be saved without a team store (global logos)
ALTER TABLE public.store_logos ALTER COLUMN team_store_id DROP NOT NULL;