import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useEffectiveCategories } from "@/components/admin/team-stores/StoreCategoryManager";
import { StoreCategoryManager } from "@/components/admin/team-stores/StoreCategoryManager";
import { AddProductsWizard } from "@/components/admin/team-stores/AddProductsWizard";
import { ProductListPane, type StoreProduct } from "@/components/admin/team-stores/ProductListPane";
import { ProductDetailPane } from "@/components/admin/team-stores/ProductDetailPane";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";

export default function StoreProducts() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addSingleOpen, setAddSingleOpen] = useState(false);
  const [singleSearch, setSingleSearch] = useState("");

  const { visible: visibleCategories } = useEffectiveCategories(store.id);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["team-store-products", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select(`
          id, style_id, sort_order, notes, price_override, active,
          fundraising_enabled, fundraising_amount_per_unit, fundraising_percentage,
          personalization_enabled, personalization_price, personalization_config,
          screen_print_enabled, embroidery_enabled, dtf_enabled,
          category_id, store_category_override_id,
          display_name, display_color, primary_image_url, extra_image_urls,
          internal_notes, allowed_colors,
          catalog_styles(id, style_id, style_name, brand_name, style_image, description),
          team_store_categories(id, name)
        `)
        .eq("team_store_id", store.id)
        .order("sort_order");
      if (error) throw error;
      return data as StoreProduct[];
    },
  });

  const attachedStyleIds = new Set(products.map((p) => p.style_id));

  // Single product search
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["catalog-style-search", singleSearch],
    queryFn: async () => {
      if (!singleSearch || singleSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("catalog_styles")
        .select("id, style_id, style_name, brand_name, style_image")
        .or(`style_name.ilike.%${singleSearch}%,brand_name.ilike.%${singleSearch}%,style_id.eq.${isNaN(Number(singleSearch)) ? 0 : Number(singleSearch)}`)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: singleSearch.length >= 2,
  });

  const attachMutation = useMutation({
    mutationFn: async (styleId: number) => {
      const { error } = await supabase.from("team_store_products").insert({
        team_store_id: store.id,
        style_id: styleId,
        sort_order: (products?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", store.id] });
      toast.success("Product added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: "show" | "hide" | "delete"; ids: string[] }) => {
      if (action === "delete") {
        const { error } = await supabase.from("team_store_products").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("team_store_products")
          .update({ active: action === "show" })
          .in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { action, ids }) => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", store.id] });
      setSelectedIds(new Set());
      if (action === "delete" && ids.includes(selectedId || "")) setSelectedId(null);
      toast.success(action === "delete" ? `${ids.length} product(s) removed` : `${ids.length} product(s) updated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids.length > 0 ? new Set(ids) : new Set());
  }, []);

  const handleBulkAction = useCallback((action: "show" | "hide" | "delete", ids: string[]) => {
    if (action === "delete" && !confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)) return;
    bulkMutation.mutate({ action, ids });
  }, [bulkMutation]);

  const selectedItem = products.find((p) => p.id === selectedId) || null;

  const categoryOptions = visibleCategories.map((c) => ({
    id: c.globalCategoryId ?? c.id,
    name: c.name,
    slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    overrideId: c.overrideId,
    isCustom: c.isCustom,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Products — {store.name}</h2>
          <p className="text-sm text-muted-foreground">
            Manage items, pricing, fundraising, and messaging for this team store.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StoreCategoryManager storeId={store.id} />
          <Button size="sm" variant="outline" onClick={() => setAddSingleOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Single
          </Button>
          <AddProductsWizard storeId={store.id} attachedStyleIds={attachedStyleIds} />
        </div>
      </div>

      {/* Two-Pane Layout */}
      <div className="border rounded-lg overflow-hidden flex" style={{ height: "calc(100vh - 220px)" }}>
        {/* Left: Product List */}
        <div className="w-[400px] shrink-0 border-r flex flex-col overflow-hidden bg-card">
          <ProductListPane
            products={products}
            categories={visibleCategories}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onBulkAction={handleBulkAction}
            isLoading={isLoading}
          />
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 overflow-hidden bg-background">
          {selectedItem ? (
            <ProductDetailPane
              key={selectedItem.id}
              item={selectedItem}
              storeId={store.id}
              categories={categoryOptions}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select a product to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Single Product Dialog */}
      <Dialog open={addSingleOpen} onOpenChange={setAddSingleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Single Product</DialogTitle>
            <DialogDescription>Search the catalog to add a product to this store.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={singleSearch}
                onChange={(e) => setSingleSearch(e.target.value)}
                placeholder="Search by style name, brand, or style ID…"
                className="pl-9"
                autoFocus
              />
            </div>
            {singleSearch.length >= 2 && (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {searching ? (
                  <p className="p-3 text-sm text-muted-foreground">Searching…</p>
                ) : searchResults.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No results</p>
                ) : (
                  searchResults.map((style: any) => (
                    <div key={style.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        {style.style_image && (
                          <img src={style.style_image} alt="" className="w-8 h-8 object-contain rounded" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{style.style_name}</p>
                          <p className="text-xs text-muted-foreground">{style.brand_name} · #{style.style_id}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={attachedStyleIds.has(style.id) || attachMutation.isPending}
                        onClick={() => attachMutation.mutate(style.id)}
                      >
                        {attachedStyleIds.has(style.id) ? "Added" : <><Plus className="w-3 h-3 mr-1" /> Add</>}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
