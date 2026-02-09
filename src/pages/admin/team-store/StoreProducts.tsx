import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useEffectiveCategories } from "@/components/admin/team-stores/StoreCategoryManager";
import { StoreCategoryManager } from "@/components/admin/team-stores/StoreCategoryManager";
import { AddProductsWizard } from "@/components/admin/team-stores/AddProductsWizard";
import { ProductListPane, type StoreProduct } from "@/components/admin/team-stores/ProductListPane";
import { BulkAssignLogosDialog } from "@/components/admin/team-stores/BulkAssignLogosDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, Layers } from "lucide-react";
import { toast } from "sonner";

export default function StoreProducts() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addSingleOpen, setAddSingleOpen] = useState(false);
  const [bulkLogosOpen, setBulkLogosOpen] = useState(false);
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
      toast.success(action === "delete" ? `${ids.length} product(s) removed` : `${ids.length} product(s) updated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Navigate to product editor, preserving list filters in query params
  const handleSelect = useCallback((id: string) => {
    const params = new URLSearchParams();
    const s = searchParams.get("search");
    const c = searchParams.get("category");
    const st = searchParams.get("status");
    if (s) params.set("ls", s);
    if (c) params.set("lc", c);
    if (st) params.set("lst", st);
    const q = params.toString();
    navigate(`/admin/team-stores/${store.id}/products/${id}${q ? `?${q}` : ""}`);
  }, [navigate, store.id, searchParams]);

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
          {selectedIds.size > 0 && (
            <Button size="sm" variant="outline" onClick={() => setBulkLogosOpen(true)}>
              <Layers className="w-3.5 h-3.5 mr-1" /> Assign Logos ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setAddSingleOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Single
          </Button>
          <AddProductsWizard storeId={store.id} attachedStyleIds={attachedStyleIds} />
        </div>
      </div>

      {/* Full-width Product List */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <ProductListPane
          products={products}
          categories={visibleCategories}
          selectedId={null}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onBulkAction={handleBulkAction}
          isLoading={isLoading}
          initialSearch={searchParams.get("search") || ""}
          initialCategory={searchParams.get("category") || "all"}
          initialStatus={searchParams.get("status") || "all"}
        />
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

      {/* Bulk Assign Logos Dialog */}
      <BulkAssignLogosDialog
        storeId={store.id}
        selectedProductIds={Array.from(selectedIds)}
        open={bulkLogosOpen}
        onOpenChange={setBulkLogosOpen}
      />
    </div>
  );
}
