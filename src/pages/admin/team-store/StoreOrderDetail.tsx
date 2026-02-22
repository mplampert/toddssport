import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStoreOrder, useUpdateOrder, useOrderItems } from "@/hooks/useStoreOrders";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { OrderItemsEditor } from "@/components/admin/team-stores/orders/OrderItemsEditor";
import { PaymentsPanel } from "@/components/admin/team-stores/orders/PaymentsPanel";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Save, Bell, Send, MessageSquare, Mail, Phone, Loader2, Download } from "lucide-react";
import { generateOrderPdf } from "@/utils/orderPdfExport";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StoreOrderDetail() {
  const { store } = useTeamStoreContext();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useStoreOrder(orderId!);
  const { data: items = [] } = useOrderItems(orderId!);
  const updateOrder = useUpdateOrder();

  const [form, setForm] = useState<any>({});
  const [dirty, setDirty] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState<"email" | "sms">("email");
  const [messageBody, setMessageBody] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Notification timeline
  const { data: notifEvents = [] } = useQuery({
    queryKey: ["order-notifications", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_events")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

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
    const total = subtotal - Number(form.discount_total || 0) + Number(form.tax_total || 0) + Number(form.shipping_total || 0) + Number((order as any).fees_total || 0);
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
    const total = subtotal - Number(form.discount_total || 0) + Number(form.tax_total || 0) + Number(form.shipping_total || 0) + Number((order as any).fees_total || 0);
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
  const computedTotal = subtotal - Number(form.discount_total || 0) + Number(form.tax_total || 0) + Number(form.shipping_total || 0) + Number((order as any).fees_total || 0);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            generateOrderPdf({
              orderNumber: order.order_number,
              date: format(new Date(order.created_at), "MMMM d, yyyy 'at' h:mm a"),
              customerName: order.customer_name || "—",
              customerEmail: order.customer_email || undefined,
              storeName: store.name,
              status: order.status,
              fulfillmentMethod: order.fulfillment_method,
              fulfillmentStatus: order.fulfillment_status,
              items,
              subtotal,
              discountTotal: Number(form.discount_total || 0),
              taxTotal: Number(form.tax_total || 0),
              shippingTotal: Number(form.shipping_total || 0),
              feesJson: Array.isArray((order as any).fees_json) ? (order as any).fees_json : undefined,
              total: computedTotal,
              shippingAddress: order.fulfillment_method === "ship" ? {
                name: order.shipping_name || undefined,
                address1: order.shipping_address1 || undefined,
                address2: order.shipping_address2 || undefined,
                city: order.shipping_city || undefined,
                state: order.shipping_state || undefined,
                zip: order.shipping_zip || undefined,
              } : undefined,
            });
          }}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button onClick={handleSave} disabled={!dirty || updateOrder.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: customer + shipping + notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer / Billing info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Billing / Purchaser</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>Name</Label><Input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} /></div>
                <div><Label>Email</Label><Input value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient / Player */}
          {((order as any).recipient_name || (order as any).recipient_snapshot) && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Player / Recipient</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Name</span>{(order as any).recipient_name || "—"}</div>
                  <div><span className="text-muted-foreground block text-xs">Email</span>{(order as any).recipient_email || "—"}</div>
                  <div><span className="text-muted-foreground block text-xs">Phone</span>{(order as any).recipient_phone || "—"}</div>
                </div>
                {(order as any).recipient_sms_opt_in && (
                  <Badge variant="outline" className="mt-2 text-xs">SMS Opt-in</Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Promo Info */}
          {(order as any).promo_snapshot && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Promo Code</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="secondary" className="font-mono">{((order as any).promo_snapshot as any)?.code}</Badge>
                  <span className="text-muted-foreground">
                    {((order as any).promo_snapshot as any)?.discount_type === "percent"
                      ? `${((order as any).promo_snapshot as any)?.discount_value}% off`
                      : `$${Number(((order as any).promo_snapshot as any)?.discount_value || 0).toFixed(2)} off`}
                  </span>
                  <span className="font-medium">→ -${Number(((order as any).promo_snapshot as any)?.discount_amount || 0).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email: {((order as any).promo_snapshot as any)?.purchaser_email}</p>
              </CardContent>
            </Card>
          )}

          {/* Line items */}
          <OrderItemsEditor orderId={order.id} storeId={store.id} onTotalsChange={handleSubtotalChange} />

          {/* Shipping / Fulfillment */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Fulfillment</CardTitle></CardHeader>
            <CardContent>
              {order.fulfillment_method === "ship" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Ship To Name</Label><Input value={form.shipping_name} onChange={(e) => update("shipping_name", e.target.value)} /></div>
                  <div><Label>Address Line 1</Label><Input value={form.shipping_address1} onChange={(e) => update("shipping_address1", e.target.value)} /></div>
                  <div><Label>Address Line 2</Label><Input value={form.shipping_address2} onChange={(e) => update("shipping_address2", e.target.value)} /></div>
                  <div><Label>City</Label><Input value={form.shipping_city} onChange={(e) => update("shipping_city", e.target.value)} /></div>
                  <div><Label>State</Label><Input value={form.shipping_state} onChange={(e) => update("shipping_state", e.target.value)} /></div>
                  <div><Label>ZIP</Label><Input value={form.shipping_zip} onChange={(e) => update("shipping_zip", e.target.value)} /></div>
                </div>
              )}
              {order.fulfillment_method === "pickup" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Contact Name</span>{(order as any).pickup_contact_name || "—"}</div>
                  <div><span className="text-muted-foreground block text-xs">Contact Phone</span>{(order as any).pickup_contact_phone || "—"}</div>
                </div>
              )}
              {order.fulfillment_method === "local_delivery" && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Delivery Address</span>{(order as any).delivery_address || "—"}</div>
                  <div><span className="text-muted-foreground block text-xs">Instructions</span>{(order as any).delivery_instructions || "—"}</div>
                </div>
              )}
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

          {/* Notification Actions + Timeline */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const res = await supabase.functions.invoke("send-notification", {
                      body: { order_id: order.id, template_key: "order_placed" },
                    });
                    if (res.error) throw res.error;
                    toast.success("Confirmation resent");
                    queryClient.invalidateQueries({ queryKey: ["order-notifications", orderId] });
                  } catch (e: any) { toast.error(e.message); }
                }}>
                  <Mail className="w-3 h-3 mr-1" /> Resend Confirmation
                </Button>
                {order.fulfillment_method === "pickup" && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      await supabase.functions.invoke("send-notification", {
                        body: { order_id: order.id, template_key: "ready_for_pickup" },
                      });
                      toast.success("Pickup ready notification sent");
                      queryClient.invalidateQueries({ queryKey: ["order-notifications", orderId] });
                    } catch (e: any) { toast.error(e.message); }
                  }}>
                    <Send className="w-3 h-3 mr-1" /> Send Pickup Ready
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { setMessageChannel("sms"); setMessageBody(""); setMessageSubject(""); setMessageDialogOpen(true); }}>
                  <MessageSquare className="w-3 h-3 mr-1" /> Text Customer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notifEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No notifications sent yet.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {notifEvents.map((evt: any) => (
                    <div key={evt.id} className="flex items-start gap-2 p-2 rounded border bg-muted/20 text-xs">
                      {evt.channel === "email" ? <Mail className="w-3 h-3 mt-0.5 shrink-0" /> : <Phone className="w-3 h-3 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono">{evt.template_key}</span>
                          <Badge variant={evt.status === "sent" ? "default" : evt.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{evt.status}</Badge>
                          <span className="text-muted-foreground">{format(new Date(evt.created_at), "MMM d, h:mm a")}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 truncate">{evt.recipient_address}</div>
                        {evt.phone_selection_reason && <div className="text-muted-foreground">Phone reason: {evt.phone_selection_reason}</div>}
                        {evt.error && <div className="text-destructive">Error: {evt.error}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {/* Custom fees (read-only) */}
              {Array.isArray((order as any).fees_json) && (order as any).fees_json.length > 0 && (
                <>
                  {((order as any).fees_json as Array<{ name: string; amount: number }>).map((fee, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{fee.name}</span>
                      <span className="font-mono">${Number(fee.amount).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Fees Total</span>
                    <span className="font-mono">${Number((order as any).fees_total || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span className="font-mono">${computedTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <PaymentsPanel orderId={order.id} orderTotal={computedTotal} isSample={order.is_sample} customerEmail={order.customer_email || undefined} customerName={order.customer_name || undefined} />
        </div>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to Customer</DialogTitle>
            <DialogDescription>Send a direct {messageChannel === "sms" ? "SMS" : "email"} to the customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Channel</Label>
              <Select value={messageChannel} onValueChange={(v) => setMessageChannel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {messageChannel === "email" && (
              <div><Label>Subject</Label><Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} /></div>
            )}
            <div><Label>Message</Label><Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={sendingMessage || !messageBody.trim()}
              onClick={async () => {
                setSendingMessage(true);
                try {
                  const recipientAddress = messageChannel === "sms"
                    ? (order.customer_phone || (order as any).recipient_phone || "")
                    : (order.customer_email || "");
                  if (!recipientAddress) throw new Error(`No ${messageChannel === "sms" ? "phone" : "email"} on this order`);
                  const res = await supabase.functions.invoke("send-admin-message", {
                    body: {
                      customer_id: (order as any).customer_id,
                      order_id: order.id,
                      channel: messageChannel,
                      recipient_address: recipientAddress,
                      subject: messageChannel === "email" ? messageSubject : undefined,
                      body: messageBody,
                    },
                  });
                  if (res.error) throw res.error;
                  const data = res.data as any;
                  if (data?.error) throw new Error(data.error);
                  toast.success("Message sent");
                  setMessageDialogOpen(false);
                  setMessageBody("");
                } catch (e: any) {
                  toast.error(e.message);
                } finally {
                  setSendingMessage(false);
                }
              }}
            >
              {sendingMessage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
