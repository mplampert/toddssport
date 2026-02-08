
ALTER TABLE public.team_store_messages
  ADD COLUMN is_popup BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN popup_dismiss_days INTEGER DEFAULT 7;
