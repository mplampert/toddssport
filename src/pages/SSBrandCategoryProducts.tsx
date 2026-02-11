import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Package, ArrowLeft, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductRow {
  id: string;
  name: string;
  source_sku: string | null;
  image_url: string | null;
  description_short: string | null;
}

export default function SSBrandCategoryProducts() {
  const { brandName, category } = useParams<{ brandName: string; category: string }>();
  const decodedBrand = brandName ? decodeURIComponent(brandName) : "";
  const decodedCategory = category ? decodeURIComponent(category) : "";

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["ss-brand-category-products", decodedBrand, decodedCategory],
    queryFn: async () => {
      // Get brand id
      const { data: brandRow } = await supabase
        .from("brands")
        .select("id")
        .eq("name", decodedBrand)
        .maybeSingle();

      if (!brandRow) return [] as ProductRow[];

      // Convert display category back to possible DB values
      const catLower = decodedCategory.toLowerCase().replace(/ - /g, "___").replace(/ /g, "_");

      const { data, error: prodErr } = await supabase
        .from("master_products")
        .select("id, name, source_sku, image_url, description_short")
        .eq("active", true)
        .eq("brand_id", brandRow.id)
        .eq("source", "ss_activewear")
        .or(`category.ilike.${decodedCategory},category.ilike.${catLower}`)
        .order("name")
        .limit(500);

      if (prodErr) throw prodErr;
      return (data || []) as ProductRow[];
    },
    enabled: !!decodedBrand && !!decodedCategory,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    let result = products || [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.source_sku?.toLowerCase().includes(q) ||
          p.description_short?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, search]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-navy py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-3">
              <Link
                to={`/ss-products/brand/${encodeURIComponent(decodedBrand)}`}
                className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Package className="w-8 h-8 text-accent" />
              <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground">
                {decodedBrand} — {decodedCategory}
              </h1>
            </div>
            <p className="text-lg text-primary-foreground/70 max-w-2xl ml-8">
              Browse {decodedCategory} from {decodedBrand}.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b border-border bg-card sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by style or part number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isLoading && (
              <p className="text-sm text-muted-foreground mt-2">
                <Filter className="w-3 h-3 inline mr-1" />
                {filtered.length.toLocaleString()} styles found
              </p>
            )}
          </div>
        </section>

        {/* Grid */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading products…</span>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">{error instanceof Error ? error.message : "Failed to load"}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((product) => (
                  <Link
                    key={product.id}
                    to={`/catalog/${product.id}`}
                    className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative h-48 bg-secondary overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-accent transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      {product.source_sku && (
                        <p className="text-xs text-muted-foreground mb-2">SKU: {product.source_sku}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}