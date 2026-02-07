import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ProductRowCard } from "./ProductRowCard";

interface Props {
  storeId: string;
}

export function TeamStoreProducts({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: attached = [], isLoading } = useQuery({
    queryKey: ["team-store-products", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select("id, style_id, sort_order, notes, price_override, active, fundraising_enabled, fundraising_amount_per_unit, personalization_enabled, personalization_price, personalization_config, screen_print_enabled, embroidery_enabled, dtf_enabled, catalog_styles(style_name, brand_name, style_id, style_image)")
        .eq("team_store_id", storeId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["catalog-style-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("catalog_styles")
        .select("id, style_id, style_name, brand_name, style_image")
        .or(`style_name.ilike.%${search}%,brand_name.ilike.%${search}%,style_id.eq.${isNaN(Number(search)) ? 0 : Number(search)}`)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: search.length >= 2,
  });

  const attachMutation = useMutation({
    mutationFn: async (styleId: number) => {
      const { error } = await supabase.from("team_store_products").insert({
        team_store_id: storeId,
        style_id: styleId,
        sort_order: (attached?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", storeId] });
      toast.success("Product added");
    },
    onError: (e: Error) => toast.error(e.message),
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

  const attachedStyleIds = new Set(attached.map((a: any) => a.style_id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Products in This Store ({attached.length})</CardTitle>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="btn-cta">
              <Plus className="w-4 h-4 mr-1" /> Add Products
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Search Catalog Styles</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by style name, brand, or style ID…"
                className="pl-9"
              />
            </div>
            {search.length >= 2 && (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {searching ? (
                  <p className="p-3 text-sm text-muted-foreground">Searching…</p>
                ) : searchResults.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No results</p>
                ) : (
                  searchResults.map((style: any) => (
                    <div key={style.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        {style.style_image && <img src={style.style_image} alt="" className="w-8 h-8 object-contain rounded" />}
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
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : attached.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products attached yet. Click "Add Products" to get started.</p>
        ) : (
          <div className="space-y-3">
            {attached.map((item: any) => (
              <ProductRowCard
                key={item.id}
                item={item}
                storeId={storeId}
                onRemove={() => detachMutation.mutate(item.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
