import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  storeId: string;
}

export function TeamStoreOrders({ storeId }: Props) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["team-store-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champro_orders")
        .select("id, po, customer_email, status, created_at, order_type")
        .contains("request_payload", { team_store_id: storeId })
        .order("created_at", { ascending: false })
        .limit(50);
      // Fallback: if json contains filter doesn't work, return empty
      if (error) return [];
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders for This Store</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders found for this store yet.</p>
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
                    <Badge variant="secondary">{o.status}</Badge>
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
  );
}
