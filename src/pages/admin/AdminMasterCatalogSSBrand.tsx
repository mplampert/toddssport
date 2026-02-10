import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Package, Search, Plus, Store, Download } from "lucide-react";
import { toast } from "sonner";

/**
 * Brand detail for S&S-only brands not yet in the DB.
 * Shows live S&S API data and allows importing into master_products.
 */
export default function AdminMasterCatalogSSBrand() {
  const { brandName } = useParams<{ brandName: string }>();
  const decodedBrand = brandName ? decodeURIComponent(brandName) : "";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: styles, isLoading } = useQuery({
    queryKey: ["ss-brand-styles", decodedBrand],
    queryFn: async () => {
      const data = await getStyles();
      const all = Array.isArray(data) ? data : [];
      return all.filter((s) => s.brandName === decodedBrand);
    },
    enabled: !!decodedBrand,
    staleTime: 5 * 60 * 1000,
  });

  const brandImage = (styles || [])[0]?.brandImage;

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of styles || []) {
      const cat = s.baseCategory || "Other";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [styles]);

  const filtered = useMemo(() => {
    return (styles || []).filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.styleName.toLowerCase().includes(q) &&
          !(s.partNumber || "").toLowerCase().includes(q) &&
          !(s.title || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (categoryFilter !== "all" && (s.baseCategory || "Other") !== categoryFilter) return false;
      return true;
    });
  }, [styles, search, categoryFilter]);

  // Import all filtered into master_products
  const [importing, setImporting] = useState(false);
  const handleImportAll = async () => {
    if (!filtered.length) return;
    setImporting(true);
    try {
      // Upsert brand
      const { error: brandErr } = await supabase
        .from("brands")
        .upsert({ name: decodedBrand, logo_url: brandImage || null }, { onConflict: "name" });
      if (brandErr) console.warn("Brand upsert:", brandErr.message);

      const { data: allBrands } = await supabase.from("brands").select("id, name");
      const brandId = (allBrands || []).find((b) => b.name === decodedBrand)?.id;

      const catMap: Record<string, string> = {
        "T-Shirts": "tee", "Fleece": "hoodie", "Sweatshirts/Fleece": "hoodie",
        "Polos/Knits": "polo", "Caps": "hat", "Headwear": "hat",
        "Woven Shirts": "woven", "Pants/Shorts": "pants", "Outerwear": "outerwear",
        "Bags": "bag", "Accessories": "accessory", "Activewear": "activewear",
        "Infant/Toddler": "youth", "Youth": "youth",
      };

      const rows = filtered.map((s) => ({
        brand_id: brandId || null,
        name: s.title || s.styleName,
        category: catMap[s.baseCategory || ""] || (s.baseCategory || "other").toLowerCase().replace(/[^a-z0-9]/g, "_"),
        product_type: "blank_apparel",
        source: "ss_activewear",
        source_sku: s.partNumber || String(s.styleID),
        image_url: s.styleImage || null,
        description_short: s.description?.substring(0, 200) || null,
        active: true,
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await supabase.from("master_products").insert(rows.slice(i, i + 50));
        if (error) throw error;
      }

      toast.success(`Imported ${rows.length} products into master catalog`);
      queryClient.invalidateQueries({ queryKey: ["master-catalog-db"] });
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

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
            {brandImage ? (
              <img src={brandImage} alt={decodedBrand} className="h-10 object-contain brightness-0 invert" />
            ) : (
              <Package className="w-8 h-8 text-accent" />
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              {decodedBrand}
            </h1>
          </div>
          <div className="flex items-center gap-3 ml-8">
            <Badge variant="secondary" className="text-xs">S&S Activewear</Badge>
            <span className="text-primary-foreground/70 text-sm">
              {(styles || []).length} styles (live feed)
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
            All ({(styles || []).length})
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
              {cat} ({count})
            </button>
          ))}
        </div>

        {/* Filters + Import */}
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
          <Button variant="outline" size="sm" onClick={handleImportAll} disabled={importing || !filtered.length}>
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Import {filtered.length} to Master Catalog
          </Button>
          <p className="text-sm text-muted-foreground self-center ml-auto">
            {filtered.length} of {(styles || []).length} styles
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
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filtered.map((s) => (
              <div
                key={s.styleID}
                className="group bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                <div className="h-40 bg-secondary flex items-center justify-center overflow-hidden">
                  {s.styleImage ? (
                    <img
                      src={s.styleImage}
                      alt={s.styleName}
                      className="max-h-full max-w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-2 group-hover:text-accent transition-colors">
                    {s.title || s.styleName}
                  </h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      S&S
                    </span>
                    {s.baseCategory && (
                      <Badge variant="secondary" className="text-[10px]">{s.baseCategory}</Badge>
                    )}
                  </div>
                  {s.partNumber && (
                    <p className="text-xs text-muted-foreground">SKU: {s.partNumber}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
