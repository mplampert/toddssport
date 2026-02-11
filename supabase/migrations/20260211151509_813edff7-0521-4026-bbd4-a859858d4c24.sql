-- Drop the existing unique constraint that doesn't account for variant_color
ALTER TABLE public.team_store_item_logos
  DROP CONSTRAINT team_store_item_logos_item_logo_view_key;

-- Recreate with variant_color included (using COALESCE for null handling)
CREATE UNIQUE INDEX team_store_item_logos_item_logo_view_color_key
  ON public.team_store_item_logos (team_store_item_id, store_logo_id, view, COALESCE(variant_color, '__all__'));