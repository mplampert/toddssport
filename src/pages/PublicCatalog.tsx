import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CatalogCategoryTiles } from "@/components/catalog/CatalogCategoryTiles";
import { CatalogFilterBar } from "@/components/catalog/CatalogFilterBar";
import {
  CatalogProductCard,
  type CatalogProductData,
  type ProductColorDot,
} from "@/components/catalog/CatalogProductCard";
import { PopularProductsRow } from "@/components/catalog/PopularProductsRow";
import { SeasonOccasionPills, type CollectionPill } from "@/components/catalog/SeasonOccasionPills";
import { buildCategoryFilter } from "@/lib/catalogCategories";

const PAGE_SIZE = 36;

export default function PublicCatalog() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState<{ type: "season" | "occasion"; value: string } | null>(null);
  const [page, setPage] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const resetPage = () => setPage(0);

  // ── Filter options (brands) ──
  const { data: filterOptions } = useQuery({
    queryKey: ["public-catalog-filters"],
    queryFn: async () => {
      const { data: brandsData } = await supabase
        .from("brands")
        .select("id, name, show_in_catalog")
        .order("name");

      const brands = (brandsData || [])
        .filter((b: any) => b.show_in_catalog !== false)
        .map((b: any) => ({ id: b.id, name: b.name }));

      const hiddenBrandIds = (brandsData || [])
        .filter((b: any) => b.show_in_catalog === false)
        .map((b: any) => b.id);

      return { brands, hiddenBrandIds };
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Main product query ──
  const { data: queryResult, isLoading } = useQuery({
    queryKey: [
      "public-catalog-products",
      page,
      brandFilter,
      categoryFilter,
      search,
      collectionFilter,
      filterOptions?.hiddenBrandIds,
    ],
    queryFn: async () => {
      let query = supabase
        .from("master_products")
        .select(
          "id, name, category, image_url, source_sku, style_code, brand_id, brands!master_products_brand_id_fkey(name, logo_url)",
          { count: "exact" }
        )
        .eq("active", true)
        .order("name")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Exclude hidden brands
      const hiddenIds = filterOptions?.hiddenBrandIds || [];
      if (hiddenIds.length > 0) {
        query = query.not("brand_id", "in", `(${hiddenIds.join(",")})`);
      }

      // Brand filter
      if (brandFilter !== "all") {
        const { data: brandData } = await supabase
          .from("brands")
          .select("id")
          .eq("name", brandFilter)
          .maybeSingle();
        if (brandData) {
          query = query.eq("brand_id", brandData.id);
        }
      }

      // Category filter (group-based)
      if (categoryFilter !== "all") {
        const dbValues = buildCategoryFilter(categoryFilter);
        if (dbValues.length === 1) {
          query = query.ilike("category", dbValues[0]);
        } else {
          const orClause = dbValues.map((v) => `category.ilike.${v}`).join(",");
          query = query.or(orClause);
        }
      }

      // Season/occasion filter
      if (collectionFilter) {
        if (collectionFilter.type === "season") {
          query = query.contains("seasons", [collectionFilter.value]);
        } else {
          query = query.contains("occasions", [collectionFilter.value]);
        }
      }

      // Search
      if (search.trim()) {
        const q = `%${search.trim()}%`;
        query = query.or(
          `name.ilike.${q},source_sku.ilike.${q},style_code.ilike.${q}`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const products: CatalogProductData[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        image_url: p.image_url,
        source_sku: p.source_sku,
        style_code: p.style_code,
        brand_name: p.brands?.name || null,
      }));

      return { products, totalCount: count || 0 };
    },
  });

  const products = queryResult?.products || [];
  const totalCount = queryResult?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const brands = filterOptions?.brands || [];

  // ── Fetch color dots for current page products ──
  const productIds = products.map((p) => p.id);
  const { data: colorDotsMap = {} } = useQuery({
    queryKey: ["catalog-color-dots", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return {};
      const { data, error } = await supabase
        .from("product_color_images")
        .select("master_product_id, color_name, color1, swatch_image_url")
        .in("master_product_id", productIds)
        .order("color_name");
      if (error) throw error;

      const map: Record<string, ProductColorDot[]> = {};
      (data || []).forEach((row: any) => {
        if (!map[row.master_product_id]) map[row.master_product_id] = [];
        map[row.master_product_id].push({
          color_name: row.color_name,
          color1: row.color1,
          swatch_image_url: row.swatch_image_url,
        });
      });
      return map;
    },
    enabled: productIds.length > 0,
  });

  const clearFilters = () => {
    setSearch("");
    setBrandFilter("all");
    setCategoryFilter("all");
    setCollectionFilter(null);
    setPage(0);
  };

  const handleCategoryTileClick = (groupLabel: string) => {
    setCategoryFilter(groupLabel || "all");
    resetPage();
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleCollectionSelect = (pill: CollectionPill | null) => {
    setCollectionFilter(pill ? { type: pill.filterType, value: pill.filterValue } : null);
    resetPage();
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters = search || brandFilter !== "all" || categoryFilter !== "all" || collectionFilter !== null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-navy py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-8 h-8 text-accent" />
              <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground">
                Product Catalog
              </h1>
            </div>
            <p className="text-lg text-primary-foreground/70 max-w-2xl">
              Browse our full selection of blank apparel, uniforms, and
              promotional products from top brands. Click any product to view
              details and request a quote.
            </p>
          </div>
        </section>

        {/* Popular Products Row */}
        <PopularProductsRow />

        {/* Category Tiles */}
        <CatalogCategoryTiles
          onSelect={handleCategoryTileClick}
          activeCategory={categoryFilter !== "all" ? categoryFilter : null}
        />

        {/* Season/Occasion Collection Pills */}
        <SeasonOccasionPills
          activeFilter={collectionFilter}
          onSelect={handleCollectionSelect}
        />

        {/* Filters */}
        <CatalogFilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            resetPage();
          }}
          brandFilter={brandFilter}
          onBrandChange={(v) => {
            setBrandFilter(v);
            resetPage();
          }}
          categoryFilter={categoryFilter}
          onCategoryChange={(v) => {
            setCategoryFilter(v);
            resetPage();
          }}
          brands={brands}
          onClearAll={clearFilters}
          totalCount={totalCount}
          collectionFilter={collectionFilter}
          onCollectionClear={() => { setCollectionFilter(null); resetPage(); }}
        />

        {/* Product Grid */}
        <section className="py-8" ref={gridRef}>
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                {!hasActiveFilters && (
                  <p className="text-sm text-muted-foreground mb-6">
                    {totalCount.toLocaleString()} products
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                  {products.map((product) => (
                    <CatalogProductCard
                      key={product.id}
                      product={product}
                      colorDots={colorDotsMap[product.id] || []}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
