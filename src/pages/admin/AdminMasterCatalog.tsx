import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Package, Search, Eye, EyeOff } from "lucide-react";
import { useState, useMemo } from "react";
import { SSImportDialog } from "@/components/admin/catalog/SSImportDialog";
import { useToast } from "@/hooks/use-toast";

interface MergedBrand {
  id: string;
  name: string;
  logo_url: string | null;
  styleCount: number;
  sources: Set<string>;
  dbBrandId?: string;
  show_in_catalog?: boolean;
}

export default function AdminMasterCatalog() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch DB brands + master_products
  const { data: dbData, isLoading: dbLoading } = useQuery({
    queryKey: ["master-catalog-db"],
    queryFn: async () => {
      const [brandsRes, productsRes] = await Promise.all([
        supabase.from("brands").select("id, name, logo_url, show_in_catalog").order("name"),
        supabase.from("master_products").select("brand_id, source, product_type").eq("active", true),
      ]);
      if (brandsRes.error) throw brandsRes.error;
      if (productsRes.error) throw productsRes.error;
      return { brands: brandsRes.data || [], products: productsRes.data || [] };
    },
  });

  // Fetch live S&S styles (same as /ss-products)
  const { data: ssStyles, isLoading: ssLoading } = useQuery({
    queryKey: ["ss-all-styles"],
    queryFn: async () => {
      const data = await getStyles();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = dbLoading || ssLoading;

  // Merge DB brands with live S&S brands
  const { brands, totalStyles } = useMemo(() => {
    const map = new Map<string, MergedBrand>();

    // 1) Add DB brands with master_products counts
    if (dbData) {
      const brandById = new Map(dbData.brands.map((b) => [b.id, b]));
      const counts = new Map<string, { count: number; sources: Set<string> }>();

      for (const p of dbData.products) {
        // Apply filters for DB products
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

      for (const [brandId, info] of counts) {
        if (brandId === "__unbranded__") {
          map.set("__unbranded__", {
            id: "unbranded",
            name: "Other / Unbranded",
            logo_url: null,
            styleCount: info.count,
            sources: info.sources,
          });
        } else {
          const brand = brandById.get(brandId);
          if (brand) {
            map.set(brand.name.toLowerCase(), {
              id: brand.id,
              name: brand.name,
              logo_url: brand.logo_url,
              styleCount: info.count,
              sources: info.sources,
              dbBrandId: brand.id,
              show_in_catalog: brand.show_in_catalog ?? true,
            });
          }
        }
      }
    }

    // 2) Merge live S&S brands (add new ones, boost counts for existing)
    if (ssStyles && (sourceFilter === "all" || sourceFilter === "ss_activewear") && (typeFilter === "all" || typeFilter === "blank_apparel")) {
      for (const s of ssStyles) {
        if (!s.brandName) continue;
        const key = s.brandName.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          // Only add S&S styles not already counted in DB
          // We use a simple heuristic: if ss_activewear is already a source, DB already has some
          if (!existing.sources.has("ss_activewear")) {
            existing.styleCount += 1;
            existing.sources.add("ss_activewear");
          }
          // Update logo if missing
          if (!existing.logo_url && s.brandImage) {
            existing.logo_url = s.brandImage;
          }
        } else {
          // New brand only from S&S
          const prev = map.get(key);
          if (prev) {
            prev.styleCount++;
          } else {
            map.set(key, {
              id: `ss-${encodeURIComponent(s.brandName)}`,
              name: s.brandName,
              logo_url: s.brandImage || null,
              styleCount: 1,
              sources: new Set(["ss_activewear"]),
            });
          }
        }
      }
    }

    const result = [...map.values()].sort((a, b) => b.styleCount - a.styleCount);
    const total = result.reduce((sum, b) => sum + b.styleCount, 0);
    return { brands: result, totalStyles: total };
  }, [dbData, ssStyles, sourceFilter, typeFilter]);

  const filtered = brands.filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

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
                  brand.show_in_catalog === false ? "border-destructive/40 opacity-60" : "border-border"
                }`}
              >
                {/* Catalog visibility toggle */}
                {brand.dbBrandId && (
                  <div
                    className="absolute top-2 right-2 z-10 flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {brand.show_in_catalog !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </span>
                    <Switch
                      checked={brand.show_in_catalog !== false}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from("brands")
                          .update({ show_in_catalog: checked } as any)
                          .eq("id", brand.dbBrandId!);
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
                    brand.dbBrandId
                      ? `/admin/catalog/master/brands/${brand.dbBrandId}`
                      : brand.id === "unbranded"
                      ? `/admin/catalog/master/brands/unbranded`
                      : `/admin/catalog/master/brands/ss/${encodeURIComponent(brand.name)}`
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
