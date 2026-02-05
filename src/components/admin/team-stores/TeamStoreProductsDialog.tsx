import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface Props {
  store: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamStoreProductsDialog({ store, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Attached products
  const { data: attached = [], isLoading: loadingAttached } = useQuery({
    queryKey: ["team-store-products", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_products")
        .select("id, style_id, sort_order, catalog_styles(style_name, brand_name, style_id, style_image)")
        .eq("team_store_id", store.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Search catalog styles
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
        team_store_id: store.id,
        style_id: styleId,
        sort_order: (attached?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-products", store.id] });
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
      queryClient.invalidateQueries({ queryKey: ["team-store-products", store.id] });
      toast.success("Product removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const attachedStyleIds = new Set(attached.map((a: any) => a.style_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Products — {store.name}</DialogTitle>
        </DialogHeader>

        {/* Search to add */}
        <div className="space-y-3">
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
            <div className="border rounded-md max-h-48 overflow-y-auto">
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

        {/* Attached products list */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Attached Products ({attached.length})</h3>
          {loadingAttached ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : attached.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products attached yet. Use the search above to add products.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attached.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">
                      {item.catalog_styles?.style_name ?? `Style #${item.style_id}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.catalog_styles?.brand_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => detachMutation.mutate(item.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
