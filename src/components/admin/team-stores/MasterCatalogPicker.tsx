import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Loader2, Check, Package } from "lucide-react";
import { toast } from "sonner";

interface Props {
  storeId: string;
  existingStyleIds?: number[];
  existingMasterIds?: string[];
  onAdded?: () => void;
}

export function MasterCatalogPicker({ storeId, existingStyleIds = [], existingMasterIds = [], onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["master-catalog-picker", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_products")
        .select("id, name, category, product_type, source, source_sku, image_url, brand_id, brands:brand_id(name)")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const categories = useMemo(
    () => [...new Set((products || []).map((p) => p.category))].sort(),
    [products]
  );
  const sources = useMemo(
    () => [...new Set((products || []).map((p) => p.source))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.source_sku || "").toLowerCase().includes(q)) return false;
      }
      if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      return true;
    });
  }, [products, search, sourceFilter, categoryFilter]);

  const alreadyAdded = new Set(existingMasterIds);

  const addProduct = useMutation({
    mutationFn: async (product: any) => {
      const { error } = await supabase.from("team_store_products").insert({
        team_store_id: storeId,
        style_id: 0, // placeholder for transition
        master_product_id: product.id,
        display_name: product.name,
        primary_image_url: product.image_url,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: (_, product) => {
      toast.success(`Added "${product.name}" to store`);
      alreadyAdded.add(product.id);
      setAdding((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
      queryClient.invalidateQueries({ queryKey: ["team-store-products"] });
      onAdded?.();
    },
    onError: (err: any, product) => {
      toast.error(`Failed to add "${product.name}": ${err.message}`);
      setAdding((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
    },
  });

  const handleAdd = (product: any) => {
    setAdding((prev) => new Set(prev).add(product.id));
    addProduct.mutate(product);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="w-4 h-4 mr-2" />
          Add from Master Catalog
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Products from Master Catalog</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 py-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((s) => (<SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No products match your filters</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
              {filtered.map((p) => {
                const isAdded = alreadyAdded.has(p.id);
                const isAdding_ = adding.has(p.id);
                return (
                  <div key={p.id} className="flex gap-3 p-3 border border-border rounded-lg">
                    <div className="w-16 h-16 rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{(p as any).brands?.name || "—"}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{p.source.replace("_", " ")}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{p.category}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isAdded ? (
                        <Button size="sm" variant="ghost" disabled className="h-8 w-8 p-0">
                          <Check className="w-4 h-4 text-accent" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleAdd(p)} disabled={isAdding_}>
                          {isAdding_ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
