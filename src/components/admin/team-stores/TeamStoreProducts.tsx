import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ProductRowCard } from "./ProductRowCard";
import { StoreCategoryManager, useEffectiveCategories } from "./StoreCategoryManager";
import { AddProductsWizard } from "./AddProductsWizard";
import { MasterCatalogPicker } from "./MasterCatalogPicker";

interface Props {
  storeId: string;
}

export function TeamStoreProducts({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch effective categories (global + overrides merged)
  const { visible: visibleCategories } = useEffectiveCategories(storeId);

  const { data: attached = [], isLoading } = useQuery({
    queryKey: ["team-store-products", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select("id, style_id, sort_order, notes, price_override, active, fundraising_enabled, fundraising_amount_per_unit, personalization_enabled, personalization_price, personalization_config, screen_print_enabled, embroidery_enabled, dtf_enabled, category_id, store_category_override_id, catalog_styles(style_name, brand_name, style_id, style_image), team_store_categories(id, name)")
        .eq("team_store_id", storeId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const detachMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_store_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Product removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase.from("team_store_products").update({ sort_order: u.sort_order }).eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDragDrop = (fromIndex: number, toIndex: number) => {
    const list = categoryFilter === "uncategorized"
      ? attached.filter((a: any) => !a.category_id && !a.store_category_override_id)
      : filtered;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
    // Reorder the list and assign new sort_order values
    const reordered = [...list];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updates = reordered.map((item: any, idx: number) => ({ id: item.id, sort_order: idx }));
    reorderMutation.mutate(updates);
  };

  const attachedStyleIds = new Set(attached.map((a: any) => a.style_id));

  // Filter by category (match on category_id or store_category_override_id)
  const filtered = categoryFilter
    ? attached.filter((a: any) => a.category_id === categoryFilter || a.store_category_override_id === categoryFilter)
    : attached;

  // Count per category
  const uncategorizedCount = attached.filter((a: any) => !a.category_id && !a.store_category_override_id).length;

  // Convert effective categories to the format ProductRowCard expects
  const categoryOptions = visibleCategories.map((c) => ({
    id: c.globalCategoryId ?? c.id,
    name: c.name,
    slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    overrideId: c.overrideId,
    isCustom: c.isCustom,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CardTitle>Products in This Store ({attached.length})</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <StoreCategoryManager storeId={storeId} />
          <MasterCatalogPicker
            storeId={storeId}
            existingMasterIds={attached.map((a: any) => a.master_product_id).filter(Boolean)}
            onAdded={() => queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] })}
          />
          <AddProductsWizard storeId={storeId} attachedStyleIds={attachedStyleIds} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category filter chips */}
        {visibleCategories.length > 0 && attached.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === null
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({attached.length})
            </button>
            {visibleCategories.map((cat) => {
              const catId = cat.globalCategoryId ?? cat.id;
              const count = attached.filter((a: any) => a.category_id === catId || a.store_category_override_id === cat.overrideId).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(catId)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === catId
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
            {uncategorizedCount > 0 && (
              <button
                onClick={() => setCategoryFilter("uncategorized")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === "uncategorized"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Uncategorized ({uncategorizedCount})
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : attached.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products attached yet. Click "Add Products" to get started.</p>
        ) : (
          <div className="space-y-3" onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}>
            {(() => {
              const list = categoryFilter === "uncategorized"
                ? attached.filter((a: any) => !a.category_id && !a.store_category_override_id)
                : filtered;
              return list.map((item: any, idx: number) => (
                <ProductRowCard
                  key={item.id}
                  item={item}
                  storeId={storeId}
                  onRemove={() => detachMutation.mutate(item.id)}
                  onDragStart={() => { dragIndexRef.current = idx; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                  onDrop={() => {
                    if (dragIndexRef.current !== null) {
                      handleDragDrop(dragIndexRef.current, idx);
                    }
                    dragIndexRef.current = null;
                    setDragOverIndex(null);
                  }}
                  isDragOver={dragOverIndex === idx}
                  categories={categoryOptions}
                />
              ));
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
