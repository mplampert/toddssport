-- Add pricing columns to master_products
ALTER TABLE public.master_products
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS msrp numeric;

-- Populate msrp from champro_products for champro source
UPDATE public.master_products mp
SET msrp = cp.msrp
FROM public.champro_products cp
WHERE mp.source = 'champro'
  AND mp.source_sku = cp.product_master
  AND cp.msrp IS NOT NULL
  AND mp.msrp IS NULL;

-- Populate base_price from champro_wholesale for champro source
UPDATE public.master_products mp
SET base_price = cw.base_cost
FROM public.champro_products cp
JOIN public.champro_wholesale cw ON cw.champro_product_id = cp.id
WHERE mp.source = 'champro'
  AND mp.source_sku = cp.product_master
  AND mp.base_price IS NULL;