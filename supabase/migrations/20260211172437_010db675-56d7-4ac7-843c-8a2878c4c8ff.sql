
-- Remove duplicate master_products, keeping the newest row per (source, source_sku)
DELETE FROM public.master_products
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY source, source_sku ORDER BY updated_at DESC) as rn
    FROM public.master_products
    WHERE source_sku IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Now create the unique index
CREATE UNIQUE INDEX master_products_source_sku_uniq ON public.master_products (source, source_sku) WHERE source_sku IS NOT NULL;
