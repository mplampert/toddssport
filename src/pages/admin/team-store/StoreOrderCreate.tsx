import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useCreateOrder } from "@/hooks/useStoreOrders";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardPaymentForm } from "@/components/admin/team-stores/orders/CardPaymentForm";
import { AddLineItemDialog } from "@/components/admin/team-stores/orders/AddLineItemDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Save, Trash2, CreditCard } from "lucide-react";

interface DraftItem {
  team_store_product_id: string;
  product_name_snapshot: string;
  variant_snapshot: any;
  quantity: number;
  unit_price: number;
  personalization_name: string;
  personalization_number: string;
}

export default function StoreOrderCreate() {
  const { store } = useTeamStoreContext();
  const navigate = useNavigate();
  const createOrder = useCreateOrder(store.id);

  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [fulfillment, setFulfillment] = useState("ship");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState({ internal: "", customer: "" });
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [addPending, setAddPending] = useState(false);

  const { data: storeProducts = [] } = useQuery({
    queryKey: ["store-products-for-order", store.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_products")
        .select("id, display_name, price_override, style_id, allowed_colors, catalog_styles(style_name, style_image, style_id, part_number)")
        .eq("team_store_id", store.id)
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = subtotal - discount + tax + shipping;

  const handleAddFromDialog = async (payload: any) => {
    setAddPending(true);
    try {
      setItems((prev) => [...prev, {
        team_store_product_id: payload.team_store_product_id || "",
        product_name_snapshot: payload.product_name_snapshot,
        variant_snapshot: payload.variant_snapshot,
        quantity: payload.quantity,
        unit_price: payload.unit_price,
        personalization_name: payload.personalization_name || "",
        personalization_number: payload.personalization_number || "",
      }]);
      setShowAddItem(false);
    } finally {
      setAddPending(false);
    }
  };




  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleCreate = async (payAfter = false) => {
    const orderItems = items.map((i) => {
      // Look up catalog info for snapshot
      const sp = storeProducts.find((p: any) => p.id === i.team_store_product_id);
      const catalogName = (sp as any)?.catalog_styles?.title || (sp as any)?.catalog_styles?.style_name || i.product_name_snapshot;
      const catalogSku = (sp as any)?.catalog_styles?.style_name || null;
      const storeDisplayName = (sp as any)?.display_name || null;
      return {
        team_store_product_id: i.team_store_product_id || null,
        product_name_snapshot: i.product_name_snapshot,
        catalog_product_name: catalogName,
        catalog_sku: catalogSku,
        store_display_name: storeDisplayName,
        variant_snapshot: i.variant_snapshot,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.quantity * i.unit_price,
        personalization_name: i.personalization_name || null,
        personalization_number: i.personalization_number || null,
      };
    });

    const result = await createOrder.mutateAsync({
      source: "manual",
      status: payAfter ? "open" : status,
      customer_name: customer.name || null,
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      fulfillment_method: fulfillment,
      subtotal,
      discount_total: discount,
      tax_total: tax,
      shipping_total: shipping,
      total,
      internal_notes: notes.internal || null,
      customer_notes: notes.customer || null,
      items: orderItems,
    } as any);

    if (result) {
      if (payAfter) {
        setCreatedOrderId(result.id);
        setShowCardPayment(true);
      } else {
        navigate(`/admin/team-stores/${store.id}/orders/${result.id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/team-stores/${store.id}/orders`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Orders
          </Button>
          <h2 className="text-xl font-bold">Create Manual Order</h2>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && total > 0 && !createdOrderId && (
            <Button variant="outline" onClick={() => handleCreate(true)} disabled={createOrder.isPending}>
              <CreditCard className="w-4 h-4 mr-1" /> Save & Take Card Payment
            </Button>
          )}
          <Button onClick={() => handleCreate(false)} disabled={createOrder.isPending || items.length === 0}>
            <Save className="w-4 h-4 mr-1" /> {status === "draft" ? "Save as Draft" : "Create Order"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Name</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowAddItem(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add products to this order.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-28">Price</TableHead>
                      <TableHead className="text-right w-24">Total</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{item.product_name_snapshot}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.variant_snapshot.size || ""}{item.variant_snapshot.color ? ` / ${item.variant_snapshot.color}` : ""}
                        </TableCell>
                        <TableCell className="text-sm">{item.quantity}</TableCell>
                        <TableCell className="font-mono text-sm">${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">${(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Internal Notes</Label><Textarea value={notes.internal} onChange={(e) => setNotes({ ...notes, internal: e.target.value })} rows={3} /></div>
              <div><Label>Customer Notes</Label><Textarea value={notes.customer} onChange={(e) => setNotes({ ...notes, customer: e.target.value })} rows={3} /></div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Order Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Save as</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fulfillment</Label>
                <Select value={fulfillment} onValueChange={setFulfillment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ship">Ship</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="deliver_to_coach">Deliver to Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Totals</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" step="0.01" className="h-8 w-24 text-right" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">Tax</span>
                <Input type="number" step="0.01" className="h-8 w-24 text-right" value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">Shipping</span>
                <Input type="number" step="0.01" className="h-8 w-24 text-right" value={shipping} onChange={(e) => setShipping(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span><span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Embedded card payment after order creation */}
      {showCardPayment && createdOrderId && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Take Card Payment</CardTitle></CardHeader>
          <CardContent>
            <CardPaymentForm
              orderId={createdOrderId}
              balanceDueDollars={total}
              customerEmail={customer.email || undefined}
              customerName={customer.name || undefined}
              onSuccess={() => navigate(`/admin/team-stores/${store.id}/orders/${createdOrderId}`)}
              onCancel={() => navigate(`/admin/team-stores/${store.id}/orders/${createdOrderId}`)}
            />
          </CardContent>
        </Card>
      )}

      <AddLineItemDialog
        open={showAddItem}
        onOpenChange={setShowAddItem}
        storeProducts={storeProducts as any}
        onAdd={handleAddFromDialog}
        isPending={addPending}
      />
    </div>
  );
}
