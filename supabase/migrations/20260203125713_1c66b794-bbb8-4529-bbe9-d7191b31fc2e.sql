-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can read active uniform cards" ON uniform_cards;

CREATE POLICY "Anyone can read active uniform cards"
ON uniform_cards
FOR SELECT
TO public
USING (is_active = true);