import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrderItems, useAddOrderItem, useUpdateOrderItem, useDeleteOrderItem, type OrderItem } from "@/hooks/useStoreOrders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  orderId: string;
  storeId: string;
  onTotalsChange: (subtotal: number) => void;
}

export function OrderItemsEditor({ orderId, storeId, onTotalsChange }: Props) {
  const { data: items = [], isLoading } = useOrderItems(orderId);
  const addItem = useAddOrderItem(orderId);
  const updateItem = useUpdateOrderItem();
  const deleteItem = useDeleteOrderItem();
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Store products for picker
  const { data: storeProducts = [] } = useQuery({
    queryKey: ["store-products-for-order", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_products")
        .select("id, display_name, price_override, style_id, catalog_styles(style_name, style_image)")
        .eq("team_store_id", storeId)
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const [newItem, setNewItem] = useState({
    team_store_product_id: "",
    product_name_snapshot: "",
    quantity: 1,
    unit_price: 0,
    variant_snapshot: {} as any,
    personalization_name: "",
    personalization_number: "",
  });

  const handleSelectProduct = (productId: string) => {
    const p = storeProducts.find((sp: any) => sp.id === productId);
    if (!p) return;
    const name = (p as any).display_name || (p as any).catalog_styles?.style_name || "Product";
    setNewItem({
      ...newItem,
      team_store_product_id: productId,
      product_name_snapshot: name,
      unit_price: Number((p as any).price_override) || 0,
    });
  };

  const handleAddItem = async () => {
    if (!newItem.product_name_snapshot) {
      toast.error("Select a product");
      return;
    }
    const lineTotal = newItem.quantity * newItem.unit_price;
    await addItem.mutateAsync({
      team_store_product_id: newItem.team_store_product_id || null,
      product_name_snapshot: newItem.product_name_snapshot,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      line_total: lineTotal,
      variant_snapshot: newItem.variant_snapshot,
      personalization_name: newItem.personalization_name || null,
      personalization_number: newItem.personalization_number || null,
    } as any);
    setShowAdd(false);
    setNewItem({ team_store_product_id: "", product_name_snapshot: "", quantity: 1, unit_price: 0, variant_snapshot: {}, personalization_name: "", personalization_number: "" });
    // Recalc
    const subtotal = [...items, { unit_price: newItem.unit_price, quantity: newItem.quantity }].reduce(
      (s, i) => s + Number(i.unit_price) * i.quantity, 0
    );
    onTotalsChange(subtotal);
  };

  const handleQtyChange = async (item: OrderItem, qty: number) => {
    if (qty < 1) return;
    await updateItem.mutateAsync({ id: item.id, order_id: item.order_id, quantity: qty, line_total: qty * Number(item.unit_price) } as any);
    const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * (i.id === item.id ? qty : i.quantity), 0);
    onTotalsChange(subtotal);
  };

  const handlePriceChange = async (item: OrderItem, price: number) => {
    await updateItem.mutateAsync({ id: item.id, order_id: item.order_id, unit_price: price, line_total: item.quantity * price } as any);
    const subtotal = items.reduce((s, i) => s + (i.id === item.id ? price : Number(i.unit_price)) * i.quantity, 0);
    onTotalsChange(subtotal);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await deleteItem.mutateAsync({ id: deleteConfirm, order_id: orderId });
    const subtotal = items.filter((i) => i.id !== deleteConfirm).reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
    onTotalsChange(subtotal);
    setDeleteConfirm(null);
  };

  const currentSubtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-28">Unit Price</TableHead>
                <TableHead className="text-right w-24">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    {item.product_name_snapshot}
                    {item.personalization_name && <span className="block text-xs text-muted-foreground">Name: {item.personalization_name}</span>}
                    {item.personalization_number && <span className="block text-xs text-muted-foreground">#{item.personalization_number}</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.variant_snapshot?.size && `Size: ${item.variant_snapshot.size}`}
                    {item.variant_snapshot?.color && ` / ${item.variant_snapshot.color}`}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={1} className="h-8 w-20"
                      defaultValue={item.quantity}
                      onBlur={(e) => handleQtyChange(item, parseInt(e.target.value) || 1)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" step="0.01" className="h-8 w-24"
                      defaultValue={Number(item.unit_price).toFixed(2)}
                      onBlur={(e) => handlePriceChange(item, parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirm(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">Subtotal</TableCell>
                <TableCell className="text-right font-mono font-medium">${currentSubtotal.toFixed(2)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add item dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>Select a product from this store to add to the order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select value={newItem.team_store_product_id} onValueChange={handleSelectProduct}>
                <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
                <SelectContent>
                  {storeProducts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name || p.catalog_styles?.style_name || `Style ${p.style_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Size</Label>
                <Input
                  placeholder="e.g. XL"
                  value={newItem.variant_snapshot.size || ""}
                  onChange={(e) => setNewItem({ ...newItem, variant_snapshot: { ...newItem.variant_snapshot, size: e.target.value } })}
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  placeholder="e.g. Navy"
                  value={newItem.variant_snapshot.color || ""}
                  onChange={(e) => setNewItem({ ...newItem, variant_snapshot: { ...newItem.variant_snapshot, color: e.target.value } })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input type="number" step="0.01" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Personalization Name</Label>
                <Input value={newItem.personalization_name} onChange={(e) => setNewItem({ ...newItem, personalization_name: e.target.value })} />
              </div>
              <div>
                <Label>Personalization #</Label>
                <Input value={newItem.personalization_number} onChange={(e) => setNewItem({ ...newItem, personalization_number: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={addItem.isPending}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Line Item?</DialogTitle>
            <DialogDescription>This will remove this item from the order. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
