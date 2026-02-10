import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { SSImportDialog } from "@/components/admin/catalog/SSImportDialog";

interface BrandWithCount {
  id: string;
  name: string;
  logo_url: string | null;
  product_count: number;
  sources: string[];
}

export default function AdminMasterCatalog() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["master-catalog-brands-full"],
    queryFn: async () => {
      const [brandsRes, productsRes] = await Promise.all([
        supabase.from("brands").select("id, name, logo_url").order("name"),
        supabase.from("master_products").select("brand_id, source, product_type").eq("active", true),
      ]);
      if (brandsRes.error) throw brandsRes.error;
      if (productsRes.error) throw productsRes.error;
      return { brands: brandsRes.data || [], products: productsRes.data || [] };
    },
  });

  const { brands, totalStyles, availableSources, availableTypes } = useMemo(() => {
    if (!data) return { brands: [] as BrandWithCount[], totalStyles: 0, availableSources: [] as string[], availableTypes: [] as string[] };

    const countMap = new Map<string | null, { count: number; sources: Set<string>; types: Set<string> }>();
    const allSources = new Set<string>();
    const allTypes = new Set<string>();

    for (const p of data.products) {
      allSources.add(p.source);
      allTypes.add(p.product_type);

      // Apply filters
      if (sourceFilter !== "all" && p.source !== sourceFilter) continue;
      if (typeFilter !== "all" && p.product_type !== typeFilter) continue;

      const key = p.brand_id || null;
      const existing = countMap.get(key);
      if (existing) {
        existing.count++;
        existing.sources.add(p.source);
      } else {
        countMap.set(key, { count: 1, sources: new Set([p.source]), types: new Set([p.product_type]) });
      }
    }

    const brandMap = new Map(data.brands.map((b) => [b.id, b]));
    const result: BrandWithCount[] = [];

    for (const [brandId, info] of countMap.entries()) {
      if (brandId && brandMap.has(brandId)) {
        const b = brandMap.get(brandId)!;
        result.push({
          id: b.id,
          name: b.name,
          logo_url: b.logo_url,
          product_count: info.count,
          sources: [...info.sources],
        });
      } else if (!brandId) {
        result.push({
          id: "unbranded",
          name: "Other / Unbranded",
          logo_url: null,
          product_count: info.count,
          sources: [...info.sources],
        });
      }
    }

    result.sort((a, b) => b.product_count - a.product_count);

    return {
      brands: result,
      totalStyles: result.reduce((sum, b) => sum + b.product_count, 0),
      availableSources: [...allSources].sort(),
      availableTypes: [...allTypes].sort(),
    };
  }, [data, sourceFilter, typeFilter]);

  const filtered = brands.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-0">
        {/* Hero - matches S&S page style */}
        <section className="bg-navy rounded-xl py-10 px-8 mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-accent" />
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
                Master Product Catalog
              </h1>
            </div>
            <SSImportDialog />
          </div>
          <p className="text-primary-foreground/70 max-w-2xl ml-11">
            Browse all brands and styles from Champro, S&S, ImprintID, and our in‑house products.
          </p>
        </section>

        {/* Stats + Filters */}
        <div className="space-y-4 mb-6">
          <p className="text-sm text-muted-foreground">
            {filtered.length} brands · {totalStyles.toLocaleString()} total styles
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {availableSources.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Product Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Brand Grid - matches /ss-products card style */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Loading brands…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No brands found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filtered.map((brand) => (
              <Link
                key={brand.id}
                to={`/admin/catalog/master/brands/${brand.id}`}
                className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center p-6"
              >
                <div className="w-full h-24 flex items-center justify-center mb-4">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground/40">
                      {brand.name.charAt(0)}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground text-center group-hover:text-accent transition-colors text-sm">
                  {brand.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {brand.product_count} {brand.product_count === 1 ? "style" : "styles"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
