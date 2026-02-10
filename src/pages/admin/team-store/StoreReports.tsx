import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function StoreReports() {
  const { store } = useTeamStoreContext();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["store-reports-orders", store.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, order_number, total, status, fulfillment_status, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const orderIds = orders.map((o: any) => o.id);

  const { data: items = [] } = useQuery({
    queryKey: ["store-reports-items", store.id, orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const { data } = await supabase
        .from("team_store_order_items")
        .select("id, order_id, product_name_snapshot, store_display_name, quantity, unit_price, catalog_sku")
        .in("order_id", orderIds);
      return data ?? [];
    },
    enabled: orderIds.length > 0,
  });

  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
  const totalOrders = orders.length;
  const totalUnits = items.reduce((s: number, i: any) => s + Number(i.quantity ?? 0), 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const fundraisingRaised = store.fundraising_percent
    ? totalRevenue * (store.fundraising_percent / 100)
    : 0;

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; orders: number }>();
    orders.forEach((o: any) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      const cur = map.get(key) ?? { month: label, revenue: 0, orders: 0 };
      cur.revenue += Number(o.total);
      cur.orders += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [orders]);

  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; units: number; gross: number }>();
    items.forEach((i: any) => {
      const name = i.store_display_name || i.product_name_snapshot || "Unknown";
      const sku = i.catalog_sku ?? "—";
      const key = `${name}|||${sku}`;
      const c = map.get(key) ?? { name, sku, units: 0, gross: 0 };
      c.units += Number(i.quantity ?? 0);
      c.gross += Number(i.unit_price ?? 0) * Number(i.quantity ?? 0);
      map.set(key, c);
    });
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [items]);

  const exportCSV = () => {
    const headers = ["Order ID", "Date", "Status", "Fulfillment", "Total"];
    const rows = orders.map((o: any) => [
      o.order_number ?? o.id.slice(0, 8),
      new Date(o.created_at).toLocaleDateString(),
      o.status,
      o.fulfillment_status ?? "—",
      Number(o.total).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store.name.replace(/\s+/g, "-").toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={orders.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign },
          { label: "Total Orders", value: totalOrders.toLocaleString(), icon: ShoppingCart },
          { label: "Units Sold", value: totalUnits.toLocaleString(), icon: Package },
          { label: "Avg Order", value: `$${avgOrder.toFixed(2)}`, icon: TrendingUp },
          ...(store.fundraising_percent
            ? [{ label: `Fundraising (${store.fundraising_percent}%)`, value: `$${fundraisingRaised.toFixed(2)}`, icon: DollarSign }]
            : []),
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "…" : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Over Time */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value: number, name: string) =>
                    name === "revenue" ? [`$${value.toFixed(2)}`, "Revenue"] : [value, "Orders"]
                  } />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Breakdown */}
      {productStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales by Product</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productStats.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-sm font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="text-right text-sm">{p.units}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${p.gross.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No orders yet for this store.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...orders].reverse().map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-sm">{o.order_number ?? o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">{o.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={o.fulfillment_status === "fulfilled" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {o.fulfillment_status?.replace(/_/g, " ") ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">${Number(o.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
