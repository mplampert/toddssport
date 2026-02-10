import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft } from "lucide-react";
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
            <Badge className="capitalize">{order.status}</Badge>
          </div>

          {/* Items */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg">Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead>Personalization</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const variant = item.variant_snapshot as any;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.store_display_name || item.product_name_snapshot || "Product"}
                        </TableCell>
                        <TableCell>{variant?.size || variant?.color || "—"}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>
                          {item.personalization_name || item.personalization_number
                            ? [item.personalization_name, item.personalization_number && `#${item.personalization_number}`].filter(Boolean).join(" ")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">{fmt(item.line_total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
