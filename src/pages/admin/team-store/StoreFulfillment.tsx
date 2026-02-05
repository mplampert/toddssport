import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Truck, Clock, CheckCircle, Package } from "lucide-react";

export default function StoreFulfillment() {
  const { store } = useTeamStoreContext();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["team-store-fulfillment", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champro_orders")
        .select("id, po, customer_email, status, created_at, order_type")
        .contains("request_payload", { team_store_id: store.id })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return [];
      return data ?? [];
    },
  });

  const statusGroups = {
    draft: orders.filter((o: any) => o.status === "draft"),
    processing: orders.filter((o: any) => ["pending", "processing", "submitted"].includes(o.status)),
    shipped: orders.filter((o: any) => ["shipped", "delivered", "completed"].includes(o.status)),
  };

  const statusIcon = (status: string) => {
    if (["shipped", "delivered", "completed"].includes(status)) return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (["pending", "processing", "submitted"].includes(status)) return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    return <Package className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Fulfillment</h2>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-2xl font-bold">{statusGroups.draft.length}</p>
            <p className="text-xs text-muted-foreground">Open / Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-2xl font-bold">{statusGroups.processing.length}</p>
            <p className="text-xs text-muted-foreground">In Production</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-2xl font-bold">{statusGroups.shipped.length}</p>
            <p className="text-xs text-muted-foreground">Shipped / Complete</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders for this store yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.po}</TableCell>
                    <TableCell className="text-sm">{o.customer_email ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusIcon(o.status)}
                        <Badge variant="secondary">{o.status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
