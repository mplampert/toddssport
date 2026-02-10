import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStyles, type SSStyle } from "@/lib/ss-activewear";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Loader2, Check, Package } from "lucide-react";
import { toast } from "sonner";

export function SSImportDialog() {
  const [open, setOpen] = useState(false);
  const [styles, setStyles] = useState<SSStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [imported, setImported] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const loadStyles = async () => {
    setLoading(true);
    try {
      const data = await getStyles();
      setStyles(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch (err) {
      toast.error("Failed to load S&S catalog");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const brands = useMemo(
    () => [...new Set(styles.map((s) => s.brandName).filter(Boolean))].sort(),
    [styles]
  );
  const categories = useMemo(
    () => [...new Set(styles.map((s) => s.baseCategory).filter(Boolean))].sort(),
    [styles]
  );

  const filtered = useMemo(() => {
    return styles.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.styleName.toLowerCase().includes(q) &&
          !s.brandName.toLowerCase().includes(q) &&
          !(s.partNumber || "").toLowerCase().includes(q) &&
          !(s.title || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (brandFilter !== "all" && s.brandName !== brandFilter) return false;
      if (categoryFilter !== "all" && s.baseCategory !== categoryFilter) return false;
      return true;
    });
  }, [styles, search, brandFilter, categoryFilter]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    const ids = filtered.map((s) => s.styleID).filter((id) => !imported.has(id));
    setSelected(new Set(ids));
  };

  const importMutation = useMutation({
    mutationFn: async (stylesToImport: SSStyle[]) => {
      // Upsert brands first
      const brandNames = [...new Set(stylesToImport.map((s) => s.brandName))];
      for (const name of brandNames) {
        const style = stylesToImport.find((s) => s.brandName === name);
        const { error } = await supabase
          .from("brands")
          .upsert({ name, logo_url: style?.brandImage || null }, { onConflict: "name" });
        if (error) console.warn("Brand upsert warning:", error.message);
      }

      // Fetch brand IDs
      const { data: allBrands } = await supabase.from("brands").select("id, name");
      const brandMap = new Map((allBrands || []).map((b) => [b.name, b.id]));

      // Map S&S category to our categories
      const catMap: Record<string, string> = {
        "T-Shirts": "tee",
        "Fleece": "hoodie",
        "Sweatshirts/Fleece": "hoodie",
        "Polos/Knits": "polo",
        "Caps": "hat",
        "Headwear": "hat",
        "Woven Shirts": "woven",
        "Pants/Shorts": "pants",
        "Outerwear": "outerwear",
        "Bags": "bag",
        "Accessories": "accessory",
        "Activewear": "activewear",
        "Infant/Toddler": "youth",
        "Youth": "youth",
      };

      // Insert master products
      const rows = stylesToImport.map((s) => ({
        brand_id: brandMap.get(s.brandName) || null,
        name: s.title || s.styleName,
        category: catMap[s.baseCategory || ""] || (s.baseCategory || "other").toLowerCase().replace(/[^a-z0-9]/g, "_"),
        product_type: "blank_apparel" as const,
        source: "ss_activewear" as const,
        source_sku: s.partNumber || String(s.styleID),
        image_url: s.styleImage || null,
        description_short: s.description?.substring(0, 200) || null,
        active: true,
      }));

      // Batch insert in chunks
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("master_products").insert(chunk);
        if (error) throw error;
      }

      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} products into master catalog`);
      setImported((prev) => new Set([...prev, ...selected]));
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["master-catalog-brands"] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog-source-counts"] });
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`);
    },
  });

  const handleImport = () => {
    const toImport = styles.filter((s) => selected.has(s.styleID));
    if (toImport.length === 0) return;
    importMutation.mutate(toImport);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Import from S&S
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import S&S Activewear Products</DialogTitle>
        </DialogHeader>

        {!loaded ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-muted-foreground">
              Load the full S&S Activewear catalog to browse and import products.
            </p>
            <Button onClick={loadStyles} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading catalog…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Load S&S Catalog
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 py-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search styles, brands, SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands ({brands.length})</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c!} value={c!}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between py-1 border-b border-border">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                  Select all visible ({filtered.filter((s) => !imported.has(s.styleID)).length})
                </Button>
                {selected.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="text-xs">
                    Clear selection
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} shown · {selected.size} selected
                </span>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={selected.size === 0 || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  Import {selected.size} Products
                </Button>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                {filtered.slice(0, 200).map((s) => {
                  const isImported = imported.has(s.styleID);
                  const isSelected = selected.has(s.styleID);
                  return (
                    <label
                      key={s.styleID}
                      className={`flex gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                      } ${isImported ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isImported}
                        onCheckedChange={() => toggleSelect(s.styleID)}
                        className="mt-1"
                      />
                      <div className="w-14 h-14 rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {s.styleImage ? (
                          <img src={s.styleImage} alt="" className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {s.title || s.styleName}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.brandName}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.partNumber && (
                            <Badge variant="outline" className="text-[10px]">{s.partNumber}</Badge>
                          )}
                          {s.baseCategory && (
                            <Badge variant="secondary" className="text-[10px]">{s.baseCategory}</Badge>
                          )}
                        </div>
                        {isImported && (
                          <span className="text-[10px] text-accent flex items-center gap-1 mt-1">
                            <Check className="w-3 h-3" /> Imported
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {filtered.length > 200 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Showing first 200 of {filtered.length} results. Use filters to narrow down.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
