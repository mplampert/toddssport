import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStoreOrders, useOrderPayments, computePaymentStatus, type StoreOrder } from "@/hooks/useStoreOrders";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, X } from "lucide-react";

interface Props {
  storeId: string;
}

function PaymentBadge({ orderId, total }: { orderId: string; total: number }) {
  const { data: payments = [] } = useOrderPayments(orderId);
  const { status } = computePaymentStatus(payments, total);
  const variant = status === "paid" ? "default" : status === "partial" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export function OrdersListTable({ storeId }: Props) {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useStoreOrders(storeId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const filtered = useMemo(() => {
    let result = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q) ||
          (o.customer_email ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((o) => o.status === statusFilter);
    if (sourceFilter) result = result.filter((o) => o.source === sourceFilter);
    return result;
  }, [orders, search, statusFilter, sourceFilter]);

  const hasFilters = search || statusFilter || sourceFilter;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Orders</CardTitle>
          <Button size="sm" onClick={() => navigate(`/admin/team-stores/${storeId}/orders/new`)}>
            <Plus className="w-4 h-4 mr-1" /> Create Manual Order
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by order #, name, email…" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter || "__all__"} onValueChange={(v) => setSourceFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sources</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setStatusFilter(""); setSourceFilter(""); }}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading orders…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{hasFilters ? "No orders match." : "No orders yet."}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/admin/team-stores/${storeId}/orders/${o.id}`)}>
                    <TableCell className="font-mono text-sm">
                      {o.order_number}
                      {o.source === "manual" && <Badge variant="outline" className="ml-2 text-xs">Manual</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{o.customer_name || o.customer_email || "—"}</TableCell>
                    <TableCell><Badge variant={o.status === "completed" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                    <TableCell><PaymentBadge orderId={o.id} total={o.total} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">${Number(o.total).toFixed(2)}</TableCell>
                    <TableCell className="text-sm capitalize">{o.fulfillment_method.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
