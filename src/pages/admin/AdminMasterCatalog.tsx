import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Package, Search, Eye, EyeOff, X } from "lucide-react";
import { useState, useEffect } from "react";
import { SSImportDialog } from "@/components/admin/catalog/SSImportDialog";
import { SSBulkImportPanel } from "@/components/admin/catalog/SSBulkImportPanel";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

interface BrandRow {
  id: string;
  name: string;
  logo_url: string | null;
  styleCount: number;
  sources: Set<string>;
  show_in_catalog: boolean;
}

export default function AdminMasterCatalog() {
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 350);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch DB brands + master_products (DB-only, no live API)
  const { data, isLoading } = useQuery({
    queryKey: ["master-catalog-db", sourceFilter, typeFilter],
    queryFn: async () => {
      const brandsRes = await supabase.from("brands").select("id, name, logo_url, show_in_catalog").order("name");
      if (brandsRes.error) throw brandsRes.error;

      // Paginate through all active products to avoid the 1000-row default limit
      let allProducts: { brand_id: string | null; source: string; product_type: string }[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page, error } = await supabase
          .from("master_products")
          .select("brand_id, source, product_type")
          .eq("active", true)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allProducts = allProducts.concat(page || []);
        if (!page || page.length < pageSize) break;
        from += pageSize;
      }

      const brandById = new Map((brandsRes.data || []).map((b: any) => [b.id, b]));
      const counts = new Map<string, { count: number; sources: Set<string> }>();

      for (const p of allProducts) {
        if (sourceFilter !== "all" && p.source !== sourceFilter) continue;
        if (typeFilter !== "all" && p.product_type !== typeFilter) continue;

        const key = p.brand_id || "__unbranded__";
        const existing = counts.get(key);
        if (existing) {
          existing.count++;
          existing.sources.add(p.source);
        } else {
          counts.set(key, { count: 1, sources: new Set([p.source]) });
        }
      }

      const brands: BrandRow[] = [];
      for (const [brandId, info] of counts) {
        if (brandId === "__unbranded__") {
          brands.push({
            id: "unbranded",
            name: "Other / Unbranded",
            logo_url: null,
            styleCount: info.count,
            sources: info.sources,
            show_in_catalog: true,
          });
        } else {
          const brand = brandById.get(brandId);
          if (brand) {
            brands.push({
              id: brand.id,
              name: brand.name,
              logo_url: brand.logo_url,
              styleCount: info.count,
              sources: info.sources,
              show_in_catalog: brand.show_in_catalog ?? true,
            });
          }
        }
      }

      brands.sort((a, b) => b.styleCount - a.styleCount);
      const total = brands.reduce((s, b) => s + b.styleCount, 0);
      return { brands, totalStyles: total };
    },
  });

  // Product search query (server-side)
  const { data: productResults, isLoading: productSearchLoading } = useQuery({
    queryKey: ["admin-product-search", debouncedProductSearch],
    enabled: debouncedProductSearch.length >= 2,
    queryFn: async () => {
      const term = `%${debouncedProductSearch}%`;
      const { data, error } = await supabase
        .from("master_products")
        .select("id, name, style_code, source, image_url, brand_id, brands!master_products_brand_id_fkey(name)")
        .eq("active", true)
        .or(`name.ilike.${term},style_code.ilike.${term}`)
        .order("name")
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const brands = data?.brands || [];
  const totalStyles = data?.totalStyles || 0;

  const filtered = brands.filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  const showProductResults = debouncedProductSearch.length >= 2;

  return (
    <AdminLayout>
      <div className="space-y-0">
        {/* Hero */}
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

        {/* Bulk S&S Import */}
        <SSBulkImportPanel />

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
                <SelectItem value="ss_activewear">S&S Activewear</SelectItem>
                <SelectItem value="champro">Champro</SelectItem>
                <SelectItem value="imprintid">ImprintID</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Product Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="blank_apparel">Blank Apparel</SelectItem>
                <SelectItem value="uniform">Uniform</SelectItem>
                <SelectItem value="promo">Promo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product Search */}
        <div className="space-y-3 mb-6">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or style code…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-10 pr-9"
            />
            {productSearch && (
              <button
                onClick={() => setProductSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showProductResults && (
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              {productSearchLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                </div>
              ) : !productResults?.length ? (
                <p className="p-4 text-sm text-muted-foreground">No products match "{debouncedProductSearch}"</p>
              ) : (
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {productResults.map((p: any) => (
                    <Link
                      key={p.id}
                      to={`/admin/catalog/master/products/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.brands?.name || "Unbranded"} {p.style_code ? `· ${p.style_code}` : ""} · {p.source}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {productResults.length === 20 && (
                    <p className="px-4 py-2 text-xs text-muted-foreground text-center">Showing first 20 results — refine your search</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Brand Grid */}
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
              <div
                key={brand.id}
                className={`group bg-card rounded-xl border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center p-6 relative ${
                  !brand.show_in_catalog ? "border-destructive/40 opacity-60" : "border-border"
                }`}
              >
                {/* Catalog visibility toggle */}
                {brand.id !== "unbranded" && (
                  <div
                    className="absolute top-2 right-2 z-10 flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {brand.show_in_catalog ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </span>
                    <Switch
                      checked={brand.show_in_catalog}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from("brands")
                          .update({ show_in_catalog: checked })
                          .eq("id", brand.id);
                        if (error) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: checked ? "Brand visible" : "Brand hidden", description: `${brand.name} ${checked ? "will" : "won't"} appear on /catalog` });
                          queryClient.invalidateQueries({ queryKey: ["master-catalog-db"] });
                        }
                      }}
                    />
                  </div>
                )}

                <Link
                  to={
                    brand.id === "unbranded"
                      ? `/admin/catalog/master/brands/unbranded`
                      : `/admin/catalog/master/brands/${brand.id}`
                  }
                  className="flex flex-col items-center w-full"
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
                    {brand.styleCount} {brand.styleCount === 1 ? "style" : "styles"}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}