import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface OrderRow {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  fulfillment_method: string;
  fulfillment_status: string;
  store_name?: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AccountOrders() {
  const { user } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("id, order_number, created_at, total, status, fulfillment_method, fulfillment_status, store_id")
        .eq("customer_id", user.id)
        .eq("is_sample", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch orders:", error);
        setLoading(false);
        return;
      }

      // Fetch store names
      const storeIds = [...new Set((data || []).map((o: any) => o.store_id).filter(Boolean))];
      let storeMap: Record<string, string> = {};
      if (storeIds.length) {
        const { data: stores } = await supabase
          .from("team_stores")
          .select("id, name")
          .in("id", storeIds);
        storeMap = Object.fromEntries((stores || []).map((s: any) => [s.id, s.name]));
      }

      setOrders(
        (data || []).map((o: any) => ({
          ...o,
          store_name: storeMap[o.store_id] || "—",
        }))
      );
      setLoading(false);
    })();
  }, [user]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-12 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8">
            <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
              ← My Account
            </Link>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="w-8 h-8 text-accent" />
              My Orders
            </h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : orders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
                <Link to="/team-stores/browse" className="text-accent hover:underline">Browse Stores →</Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fulfillment</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => (
                        <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <Link to={`/account/orders/${o.id}`} className="hover:text-accent">{o.order_number}</Link>
                          </TableCell>
                          <TableCell>{format(new Date(o.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>{o.store_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(o.total)}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[o.status] || "bg-muted"}>
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{o.fulfillment_method}</TableCell>
                          <TableCell>
                            <Link to={`/account/orders/${o.id}`}>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {orders.map((o) => (
                  <Link key={o.id} to={`/account/orders/${o.id}`}>
                    <Card className="hover:border-accent transition-colors">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{o.order_number}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</p>
                          </div>
                          <Badge className={statusColors[o.status] || "bg-muted"}>{o.status}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{o.store_name}</span>
                          <span className="font-semibold">{formatCurrency(o.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
