-- Simplify champro_pricing_settings to global only with markupPercent + rushPercent
-- First, delete sport-level settings
DELETE FROM public.champro_pricing_settings WHERE scope = 'sport';

-- Drop the constraints that require sport for sport scope
ALTER TABLE public.champro_pricing_settings DROP CONSTRAINT IF EXISTS valid_sport_for_scope;
ALTER TABLE public.champro_pricing_settings DROP CONSTRAINT IF EXISTS unique_scope_sport;

-- Drop sport column and add unique constraint on scope
ALTER TABLE public.champro_pricing_settings DROP COLUMN IF EXISTS sport;
ALTER TABLE public.champro_pricing_settings ADD CONSTRAINT unique_scope UNIQUE (scope);

-- Rename rush_markup_percent to rush_percent for clarity
ALTER TABLE public.champro_pricing_settings RENAME COLUMN rush_markup_percent TO rush_percent;

-- Update the global record to have a sensible rush percent (20%)
UPDATE public.champro_pricing_settings 
SET rush_percent = 20 
WHERE scope = 'global';

-- Simplify champro_wholesale - remove express upcharge columns
ALTER TABLE public.champro_wholesale DROP COLUMN IF EXISTS express_upcharge_cost_per_unit;
ALTER TABLE public.champro_wholesale DROP COLUMN IF EXISTS express_plus_upcharge_cost_per_unit;

-- Rename base_cost_per_unit to base_cost for clarity
ALTER TABLE public.champro_wholesale RENAME COLUMN base_cost_per_unit TO base_cost;

-- Drop champro_pricing_rules table (no more per-SKU markup overrides)
DROP TABLE IF EXISTS public.champro_pricing_rules CASCADE;