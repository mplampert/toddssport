import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Package, Search, Plus, Store } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  tee: "T‑Shirts",
  hoodie: "Hoodies & Sweatshirts",
  polo: "Polos",
  hat: "Hats & Headwear",
  pants: "Pants & Shorts",
  outerwear: "Outerwear",
  bag: "Bags",
  accessory: "Accessories",
  activewear: "Activewear",
  woven: "Woven Shirts",
  youth: "Youth",
  promo: "Promo Products",
  uniform: "Uniforms",
  other: "Other",
};

function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
}

const SOURCE_COLORS: Record<string, string> = {
  ss_activewear: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  champro: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  imprintid: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  internal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function AdminMasterCatalogBrand() {
  const { brandId } = useParams<{ brandId: string }>();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addToStoreProduct, setAddToStoreProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  const isUnbranded = brandId === "unbranded";

  const { data: brand } = useQuery({
    queryKey: ["master-catalog-brand", brandId],
    queryFn: async () => {
      if (isUnbranded) return { id: "unbranded", name: "Other / Unbranded", logo_url: null, description: null };
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, logo_url, description")
        .eq("id", brandId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["master-catalog-products", brandId],
    queryFn: async () => {
      let query = supabase
        .from("master_products")
        .select("*")
        .eq("active", true)
        .order("name");

      if (isUnbranded) {
        query = query.is("brand_id", null);
      } else {
        query = query.eq("brand_id", brandId!);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId,
  });

  // Derive categories, sources, types
  const { categories, sources, types } = useMemo(() => {
    const cats = new Map<string, number>();
    const srcs = new Set<string>();
    const typs = new Set<string>();
    for (const p of products || []) {
      cats.set(p.category, (cats.get(p.category) || 0) + 1);
      srcs.add(p.source);
      typs.add(p.product_type);
    }
    return {
      categories: [...cats.entries()].sort((a, b) => b[1] - a[1]),
      sources: [...srcs].sort(),
      types: [...typs].sort(),
    };
  }, [products]);

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.source_sku || "").toLowerCase().includes(q) &&
          !(p.description_short || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter, typeFilter]);

  // Count available_colors length for display
  function colorCount(p: any): number {
    if (Array.isArray(p.available_colors)) return p.available_colors.length;
    if (p.available_colors && typeof p.available_colors === "object") {
      return Object.keys(p.available_colors).length;
    }
    return 0;
  }

  return (
    <AdminLayout>
      <div className="space-y-0">
        {/* Brand Hero */}
        <section className="bg-navy rounded-xl py-10 px-8 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Link
              to="/admin/catalog/master"
              className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            {brand?.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-10 object-contain brightness-0 invert"
              />
            ) : (
              <Package className="w-8 h-8 text-accent" />
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              {brand?.name || "Brand"}
            </h1>
          </div>
          <div className="flex items-center gap-3 ml-8">
            {sources.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs capitalize">
                {s.replace(/_/g, " ")}
              </Badge>
            ))}
            <span className="text-primary-foreground/70 text-sm">
              {(products || []).length} styles
            </span>
          </div>
        </section>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === "all"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All ({(products || []).length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {categoryLabel(cat)} ({count})
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Product Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(categoryFilter !== "all" || typeFilter !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter("all");
                setTypeFilter("all");
                setSearch("");
              }}
            >
              Clear Filters
            </Button>
          )}
          <p className="text-sm text-muted-foreground self-center ml-auto">
            {filtered.length} of {(products || []).length} styles
          </p>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Loading products…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filtered.map((product) => {
              const colors = colorCount(product);
              return (
                <Link
                  key={product.id}
                  to={`/admin/catalog/master/products/${product.id}`}
                  className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  {/* Image */}
                  <div className="h-40 bg-secondary flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-2 group-hover:text-accent transition-colors">
                      {product.name}
                    </h3>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          SOURCE_COLORS[product.source] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {product.source.replace(/_/g, " ")}
                      </span>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {categoryLabel(product.category)}
                      </Badge>
                    </div>

                    {colors > 0 && (
                      <p className="text-xs text-muted-foreground mb-1">{colors} colors</p>
                    )}
                    {product.source_sku && (
                      <p className="text-xs text-muted-foreground">SKU: {product.source_sku}</p>
                    )}

                    <div className="mt-auto pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAddToStoreProduct(product); }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add to Team Store…
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Add to Team Store Dialog */}
      {addToStoreProduct && (
        <AddToStoreDialog
          product={addToStoreProduct}
          onClose={() => setAddToStoreProduct(null)}
        />
      )}
    </AdminLayout>
  );
}

// ─── Add to Team Store Dialog ────────────────────────────────────────────

function AddToStoreDialog({ product, onClose }: { product: any; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ["team-stores-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, slug, status")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (stores || []).filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase.from("team_store_products").insert({
        team_store_id: storeId,
        style_id: 0,
        master_product_id: product.id,
        display_name: product.name,
        primary_image_url: product.image_url,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Added "${product.name}" to store`);
      queryClient.invalidateQueries({ queryKey: ["team-store-products"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
      setAdding(null);
    },
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add to Team Store</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{product.name}</p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No stores found</p>
          ) : (
            filtered.map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  setAdding(store.id);
                  addMutation.mutate(store.id);
                }}
                disabled={adding === store.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Store className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{store.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{store.status}</p>
                </div>
                {adding === store.id && <Loader2 className="w-4 h-4 animate-spin" />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
