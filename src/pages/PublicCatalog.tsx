import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, X, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 24;

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  source: string;
  source_sku: string | null;
  product_type: string;
  description_short: string | null;
  brand_name: string | null;
  brand_logo: string | null;
}

export default function PublicCatalog() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch filter options (brands & categories)
  const { data: filterOptions } = useQuery({
    queryKey: ["public-catalog-filters"],
    queryFn: async () => {
      const [brandsRes, productsRes] = await Promise.all([
        supabase
          .from("brands")
          .select("id, name")
          .order("name"),
        supabase
          .from("master_products")
          .select("category")
          .eq("active", true),
      ]);

      const brands = (brandsRes.data || []).map((b) => b.name);

      // Dedupe + normalize categories
      const catSet = new Set<string>();
      (productsRes.data || []).forEach((p) => {
        if (p.category) {
          // Normalize: replace underscores, title-case
          const normalized = p.category
            .replace(/___/g, " - ")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
          catSet.add(normalized);
        }
      });
      const categories = Array.from(catSet).sort();

      return { brands, categories };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Main product query with server-side pagination
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ["public-catalog-products", page, brandFilter, categoryFilter, search],
    queryFn: async () => {
      // Build query
      let query = supabase
        .from("master_products")
        .select("id, name, category, image_url, source, source_sku, product_type, description_short, brand_id, brands!master_products_brand_id_fkey(name, logo_url)", { count: "exact" })
        .eq("active", true)
        .order("name")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Brand filter - need to match by brand name via the brands table
      if (brandFilter !== "all") {
        // First get the brand id
        const { data: brandData } = await supabase
          .from("brands")
          .select("id")
          .eq("name", brandFilter)
          .maybeSingle();
        if (brandData) {
          query = query.eq("brand_id", brandData.id);
        }
      }

      // Category filter - use ilike for case-insensitive matching
      if (categoryFilter !== "all") {
        // Convert display name back to possible DB values
        const catLower = categoryFilter.toLowerCase().replace(/ - /g, "___").replace(/ /g, "_");
        // Match either exact or case-insensitive
        query = query.or(`category.ilike.${categoryFilter},category.ilike.${catLower}`);
      }

      // Search
      if (search.trim()) {
        const q = `%${search.trim()}%`;
        query = query.or(`name.ilike.${q},source_sku.ilike.${q},description_short.ilike.${q}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const products: CatalogProduct[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        image_url: p.image_url,
        source: p.source,
        source_sku: p.source_sku,
        product_type: p.product_type,
        description_short: p.description_short,
        brand_name: p.brands?.name || null,
        brand_logo: p.brands?.logo_url || null,
      }));

      return { products, totalCount: count || 0 };
    },
  });

  const products = queryResult?.products || [];
  const totalCount = queryResult?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const brands = filterOptions?.brands || [];
  const categories = filterOptions?.categories || [];

  const clearFilters = () => {
    setSearch("");
    setBrandFilter("all");
    setCategoryFilter("all");
    setPage(0);
  };

  const hasActiveFilters = search || brandFilter !== "all" || categoryFilter !== "all";

  const formatCategory = (cat: string) => {
    return cat
      .replace(/___/g, " - ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
              Browse our full selection of blank apparel, uniforms, and promotional products from top brands. Click any product to view details and request a quote.
            </p>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="border-b border-border bg-card sticky top-16 md:top-20 z-30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Search by product name, style code, or brand…"
                  className="pl-9"
                />
              </div>

              <Button
                variant="outline"
                className="sm:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>

              <div className={`flex gap-3 ${showFilters ? "flex" : "hidden sm:flex"}`}>
                <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="w-3 h-3" /> Clear
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8">
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
                <p className="text-muted-foreground mb-4">Try adjusting your search or filters.</p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-muted-foreground">
                    {totalCount} product{totalCount !== 1 ? "s" : ""}
                    {hasActiveFilters ? " matching filters" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      to={`/catalog/${product.id}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
                    >
                      <div className="relative aspect-square bg-secondary/30 overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-muted-foreground/20" />
                          </div>
                        )}
                        {product.category && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 left-2 text-[10px] bg-background/90 backdrop-blur-sm"
                          >
                            {formatCategory(product.category)}
                          </Badge>
                        )}
                      </div>

                      <div className="p-3 flex-grow flex flex-col">
                        {product.brand_name && (
                          <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-0.5">
                            {product.brand_name}
                          </p>
                        )}
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                          {product.name}
                        </h3>
                        {product.source_sku && (
                          <p className="text-[11px] text-muted-foreground mt-auto">
                            #{product.source_sku}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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
                      onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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
