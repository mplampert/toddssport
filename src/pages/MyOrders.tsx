import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Package, ShoppingBag, ArrowRight, LogIn } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import { formatPrice } from "@/lib/champroPricing";
import { format } from "date-fns";

interface OrderPayload {
  sport_slug?: string;
  quantity?: number;
  lead_time?: string;
  team_name?: string;
  total_amount?: number;
  per_unit_price?: number;
  customer_email?: string;
}

interface Order {
  id: string;
  po: string;
  order_type: string;
  status: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
  request_payload: OrderPayload;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  submitted_to_champro: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paid_error_champro: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  processing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  shipped: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending Payment",
  paid: "Paid",
  submitted_to_champro: "In Production",
  paid_error_champro: "Processing Error",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default function MyOrders() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(() => {
            fetchOrders(currentSession.user.id);
          }, 0);
        } else {
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchOrders(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchOrders(userId: string) {
    try {
      const { data, error } = await supabase
        .from("champro_orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
      } else {
        // Cast the data to handle the Json type from Supabase
        const typedOrders = (data || []).map(order => ({
          ...order,
          request_payload: (order.request_payload || {}) as OrderPayload,
        }));
        setOrders(typedOrders);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }

  // Not logged in
  if (!loading && !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center py-16 px-4 bg-secondary/30">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <LogIn className="w-8 h-8 text-accent" />
              </div>
              <CardTitle>Sign In to View Orders</CardTitle>
              <CardDescription>
                Please sign in to view your order history and track your uniform orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full btn-cta">
                <Link to="/auth?returnTo=/my-orders">
                  Sign In
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/auth?tab=signup&returnTo=/my-orders" className="text-accent hover:underline">
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-12 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="w-8 h-8 text-accent" />
              My Orders
            </h1>
            <p className="text-muted-foreground mt-1">
              View and track your uniform orders
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : orders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Orders Yet
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You haven't placed any orders yet. Design your custom uniforms and place your first order!
                </p>
                <Button asChild className="btn-cta">
                  <Link to="/uniforms">
                    Browse Uniforms
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Sport</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.po}</TableCell>
                          <TableCell>
                            {format(new Date(order.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="capitalize">
                            {order.request_payload?.sport_slug?.replace("-", " ") || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {order.request_payload?.quantity || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.request_payload?.total_amount
                              ? formatPrice(order.request_payload.total_amount)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[order.status] || "bg-muted"}>
                              {statusLabels[order.status] || order.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{order.po}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge className={statusColors[order.status] || "bg-muted"}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Sport</p>
                          <p className="capitalize">
                            {order.request_payload?.sport_slug?.replace("-", " ") || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p>{order.request_payload?.quantity || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Lead Time</p>
                          <p className="capitalize">
                            {order.request_payload?.lead_time?.replace("_", " ") || "Standard"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold text-accent">
                            {order.request_payload?.total_amount
                              ? formatPrice(order.request_payload.total_amount)
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Help Section */}
          <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              Have questions about your order? Contact us at{" "}
              <a href="mailto:orders@toddssport.com" className="text-accent hover:underline">
                orders@toddssport.com
              </a>{" "}
              or call us at{" "}
              <a href="tel:+1234567890" className="text-accent hover:underline">
                (123) 456-7890
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
