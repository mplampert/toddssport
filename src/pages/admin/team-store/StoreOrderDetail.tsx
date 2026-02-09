import { useParams, useNavigate } from "react-router-dom";
import { useStoreOrder, useUpdateOrder, useOrderItems } from "@/hooks/useStoreOrders";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { OrderItemsEditor } from "@/components/admin/team-stores/orders/OrderItemsEditor";
import { PaymentsPanel } from "@/components/admin/team-stores/orders/PaymentsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function StoreOrderDetail() {
  const { store } = useTeamStoreContext();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useStoreOrder(orderId!);
  const { data: items = [] } = useOrderItems(orderId!);
  const updateOrder = useUpdateOrder();

  const [form, setForm] = useState<any>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (order) {
      setForm({
        customer_name: order.customer_name || "",
        customer_email: order.customer_email || "",
        customer_phone: order.customer_phone || "",
        shipping_name: order.shipping_name || "",
        shipping_address1: order.shipping_address1 || "",
        shipping_address2: order.shipping_address2 || "",
        shipping_city: order.shipping_city || "",
        shipping_state: order.shipping_state || "",
        shipping_zip: order.shipping_zip || "",
        fulfillment_method: order.fulfillment_method,
        fulfillment_status: order.fulfillment_status,
        status: order.status,
        discount_total: order.discount_total,
        tax_total: order.tax_total,
        shipping_total: order.shipping_total,
        internal_notes: order.internal_notes || "",
        customer_notes: order.customer_notes || "",
      });
      setDirty(false);
    }
  }, [order]);

  const update = (field: string, value: any) => {
    setForm((f: any) => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!order) return;
    const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
    const total = subtotal - Number(form.discount_total || 0) + Number(form.tax_total || 0) + Number(form.shipping_total || 0);
    await updateOrder.mutateAsync({
      id: order.id,
      ...form,
      subtotal,
      total,
      discount_total: Number(form.discount_total || 0),
      tax_total: Number(form.tax_total || 0),
      shipping_total: Number(form.shipping_total || 0),
    });
    setDirty(false);
  };

  const handleSubtotalChange = async (subtotal: number) => {
    if (!order) return;
    const total = subtotal - Number(form.discount_total || 0) + Number(form.tax_total || 0) + Number(form.shipping_total || 0);
    await updateOrder.mutateAsync({
      id: order.id,
      subtotal,
      total,
    });
  };

  if (isLoading || !order) {
    return <p className="text-sm text-muted-foreground p-4">Loading order…</p>;
  }

  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const computedTotal = subtotal - Number(form.discount_total || 0) + Number(form.tax_total || 0) + Number(form.shipping_total || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/team-stores/${store.id}/orders`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Orders
          </Button>
          <h2 className="text-xl font-bold">{order.order_number}</h2>
          <Badge variant={order.source === "manual" ? "outline" : "secondary"}>{order.source}</Badge>
          <Badge>{order.status}</Badge>
          {order.is_sample && <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">Sample</Badge>}
        </div>
        <Button onClick={handleSave} disabled={!dirty || updateOrder.isPending}>
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: customer + shipping + notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Customer Info</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>Name</Label><Input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} /></div>
                <div><Label>Email</Label><Input value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <OrderItemsEditor orderId={order.id} storeId={store.id} onTotalsChange={handleSubtotalChange} />

          {/* Shipping */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Shipping</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Ship To Name</Label><Input value={form.shipping_name} onChange={(e) => update("shipping_name", e.target.value)} /></div>
                <div><Label>Address Line 1</Label><Input value={form.shipping_address1} onChange={(e) => update("shipping_address1", e.target.value)} /></div>
                <div><Label>Address Line 2</Label><Input value={form.shipping_address2} onChange={(e) => update("shipping_address2", e.target.value)} /></div>
                <div><Label>City</Label><Input value={form.shipping_city} onChange={(e) => update("shipping_city", e.target.value)} /></div>
                <div><Label>State</Label><Input value={form.shipping_state} onChange={(e) => update("shipping_state", e.target.value)} /></div>
                <div><Label>ZIP</Label><Input value={form.shipping_zip} onChange={(e) => update("shipping_zip", e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Internal Notes</Label><Textarea value={form.internal_notes} onChange={(e) => update("internal_notes", e.target.value)} rows={3} /></div>
              <div><Label>Customer Notes</Label><Textarea value={form.customer_notes} onChange={(e) => update("customer_notes", e.target.value)} rows={3} /></div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: status + totals + payments */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Order Status</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fulfillment Method</Label>
                <Select value={form.fulfillment_method} onValueChange={(v) => update("fulfillment_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ship">Ship</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="deliver_to_coach">Deliver to Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fulfillment Status</Label>
                <Select value={form.fulfillment_status} onValueChange={(v) => update("fulfillment_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Totals</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" step="0.01" className="h-8 w-24 text-right" value={form.discount_total} onChange={(e) => update("discount_total", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">Tax</span>
                <Input type="number" step="0.01" className="h-8 w-24 text-right" value={form.tax_total} onChange={(e) => update("tax_total", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">Shipping</span>
                <Input type="number" step="0.01" className="h-8 w-24 text-right" value={form.shipping_total} onChange={(e) => update("shipping_total", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span className="font-mono">${computedTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <PaymentsPanel orderId={order.id} orderTotal={computedTotal} isSample={order.is_sample} />
        </div>
      </div>
    </div>
  );
}
