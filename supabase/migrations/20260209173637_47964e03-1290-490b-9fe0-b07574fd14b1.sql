
-- Drop the old unique constraint that doesn't account for view
ALTER TABLE public.team_store_item_logos
  DROP CONSTRAINT IF EXISTS team_store_item_logos_team_store_item_id_store_logo_id_key;

-- Re-create it including the view column
ALTER TABLE public.team_store_item_logos
  ADD CONSTRAINT team_store_item_logos_item_logo_view_key
  UNIQUE (team_store_item_id, store_logo_id, view);
