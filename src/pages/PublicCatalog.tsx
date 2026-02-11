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

interface CatalogStyle {
  id: number;
  style_id: number;
  part_number: string | null;
  brand_name: string;
  style_name: string;
  title: string | null;
  description: string | null;
  base_category: string | null;
  style_image: string | null;
  brand_image: string | null;
}

const PAGE_SIZE = 24;

export default function PublicCatalog() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all active styles from catalog_styles (our imported S&S data)
  const { data: styles = [], isLoading } = useQuery({
    queryKey: ["public-catalog-styles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_styles")
        .select("id, style_id, part_number, brand_name, style_name, title, description, base_category, style_image, brand_image")
        .eq("is_active", true)
        .order("brand_name")
        .order("style_name");
      if (error) throw error;
      return (data || []) as CatalogStyle[];
    },
  });

  // Derive filter options
  const brands = useMemo(() => {
    const set = new Set(styles.map((s) => s.brand_name));
    return Array.from(set).sort();
  }, [styles]);

  const categories = useMemo(() => {
    const set = new Set(styles.map((s) => s.base_category).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [styles]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = styles;
    if (brandFilter !== "all") {
      result = result.filter((s) => s.brand_name === brandFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((s) => s.base_category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.style_name.toLowerCase().includes(q) ||
          s.brand_name.toLowerCase().includes(q) ||
          (s.title || "").toLowerCase().includes(q) ||
          (s.part_number || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [styles, brandFilter, categoryFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setBrandFilter("all");
    setCategoryFilter("all");
    setPage(0);
  };

  const hasActiveFilters = search || brandFilter !== "all" || categoryFilter !== "all";

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
              Browse our full selection of blank apparel and accessories from top brands. Click any product to view details and request a quote.
            </p>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="border-b border-border bg-card sticky top-16 md:top-20 z-30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Search by product name, style code, or brand…"
                  className="pl-9"
                />
              </div>

              {/* Filter toggle (mobile) + desktop filters */}
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
            ) : filtered.length === 0 ? (
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
                    {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                    {hasActiveFilters ? " matching filters" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                  {paginated.map((style) => (
                    <Link
                      key={style.id}
                      to={`/catalog/${style.style_id}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-secondary/30 overflow-hidden">
                        {style.style_image ? (
                          <img
                            src={style.style_image}
                            alt={style.title || style.style_name}
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-muted-foreground/20" />
                          </div>
                        )}
                        {style.base_category && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 left-2 text-[10px] bg-background/90 backdrop-blur-sm"
                          >
                            {style.base_category}
                          </Badge>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex-grow flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-0.5">
                          {style.brand_name}
                        </p>
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                          {style.title || style.style_name}
                        </h3>
                        {style.part_number && (
                          <p className="text-[11px] text-muted-foreground mt-auto">
                            #{style.part_number}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
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
                      onClick={() => setPage((p) => p + 1)}
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
