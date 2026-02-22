import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Package, Download } from "lucide-react";
import { generateOrderPdf } from "@/utils/orderPdfExport";
import { format } from "date-fns";

export default function AccountOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useCustomerAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: o, error } = await supabase
        .from("team_store_orders")
        .select("*")
        .eq("id", id)
        .eq("customer_id", user.id)
        .maybeSingle();

      if (error || !o) {
        console.error("Order not found:", error);
        setLoading(false);
        return;
      }
      setOrder(o);

      // fetch items & store name in parallel
      const [itemsRes, storeRes] = await Promise.all([
        supabase
          .from("team_store_order_items")
          .select("*")
          .eq("order_id", o.id)
          .order("created_at"),
        supabase
          .from("team_stores")
          .select("name")
          .eq("id", o.store_id)
          .maybeSingle(),
      ]);

      setItems(itemsRes.data || []);
      setStoreName(storeRes.data?.name || "");
      setLoading(false);
    })();
  }, [user, id]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center py-16">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
            <Link to="/account/orders" className="text-accent hover:underline">← Back to Orders</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-12 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
              <p className="text-sm text-muted-foreground">
                Placed {format(new Date(order.created_at), "MMMM d, yyyy 'at' h:mm a")}
                {storeName && <> · {storeName}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                generateOrderPdf({
                  orderNumber: order.order_number,
                  date: format(new Date(order.created_at), "MMMM d, yyyy 'at' h:mm a"),
                  customerName: order.customer_name || "—",
                  customerEmail: order.customer_email || undefined,
                  storeName: storeName || undefined,
                  status: order.status,
                  fulfillmentMethod: order.fulfillment_method,
                  fulfillmentStatus: order.fulfillment_status,
                  items,
                  subtotal: order.subtotal,
                  discountTotal: order.discount_total,
                  taxTotal: order.tax_total,
                  shippingTotal: order.shipping_total,
                  feesJson: Array.isArray(order.fees_json) ? order.fees_json as any : undefined,
                  total: order.total,
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
                <Download className="w-4 h-4 mr-1" /> Download PDF
              </Button>
              <Badge className="capitalize">{order.status}</Badge>
            </div>
          </div>

          {/* Items */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg">Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map((item: any) => {
                  const variant = item.variant_snapshot as any;
                  const imgUrl = variant?.imageUrl || variant?.image_url || null;
                  return (
                    <div key={item.id} className="flex gap-4 p-4">
                      {/* Product image */}
                      <div className="w-16 h-16 shrink-0 rounded-lg border bg-muted overflow-hidden">
                        {imgUrl ? (
                          <img src={imgUrl} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {item.store_display_name || item.product_name_snapshot || "Product"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {[variant?.color, variant?.size].filter(Boolean).join(" / ") || "—"}
                          {variant?.brandName && <span className="ml-1">· {variant.brandName}</span>}
                        </p>
                        {(item.personalization_name || item.personalization_number) && (
                          <p className="text-sm text-muted-foreground">
                            {item.personalization_name && <>Name: {item.personalization_name}</>}
                            {item.personalization_name && item.personalization_number && " · "}
                            {item.personalization_number && <>#{item.personalization_number}</>}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{fmt(item.line_total)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">{fmt(item.unit_price)} ea</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Totals & Details */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                {order.discount_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-accent">-{fmt(order.discount_total)}</span></div>}
                {order.shipping_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{fmt(order.shipping_total)}</span></div>}
                {Array.isArray(order.fees_json) && order.fees_json.map((fee: any, idx: number) => (
                  <div key={idx} className="flex justify-between"><span className="text-muted-foreground">{fee.name}</span><span>{fmt(fee.amount)}</span></div>
                ))}
                {order.tax_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmt(order.tax_total)}</span></div>}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span><span>{fmt(order.total)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Fulfillment</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{order.fulfillment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize">{order.fulfillment_status}</Badge>
                </div>
                {order.fulfillment_method === "ship" && order.shipping_address1 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground mb-1">Ship To</p>
                    <p>{order.shipping_name}</p>
                    <p>{order.shipping_address1}{order.shipping_address2 && `, ${order.shipping_address2}`}</p>
                    <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
                  </div>
                )}
                {order.fulfillment_method === "pickup" && order.pickup_location_id && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground mb-1">Pickup</p>
                    {order.pickup_contact_name && <p>Contact: {order.pickup_contact_name}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Help */}
          <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              Contact us at{" "}
              <a href="mailto:orders@toddssport.com" className="text-accent hover:underline">orders@toddssport.com</a>
              {" "}or call{" "}
              <a href="tel:+1234567890" className="text-accent hover:underline">(123) 456-7890</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
