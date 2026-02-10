import { useMemo } from "react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV, itemDisplayName, itemSize } from "@/hooks/useStoreReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, ShoppingCart, Package, TrendingUp, Heart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportStoreSummary() {
  const { store } = useTeamStoreContext();
  const { orders, items, isLoading } = useStoreReportData(store.id);

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = orders.length;
  const totalUnits = items.reduce((s, i) => s + Number(i.quantity), 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const fundraisingRaised = store.fundraising_percent ? totalRevenue * (store.fundraising_percent / 100) : 0;
  const refunds = orders.filter((o) => o.payment_status === "refunded");
  const netRevenue = totalRevenue - refunds.reduce((s, o) => s + Number(o.total), 0);

  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; units: number; sales: number }>();
    items.forEach((i) => {
      const name = itemDisplayName(i);
      const sku = i.catalog_sku ?? "—";
      const key = `${name}|||${sku}`;
      const c = map.get(key) ?? { name, sku, units: 0, sales: 0 };
      c.units += Number(i.quantity);
      c.sales += Number(i.line_total);
      map.set(key, c);
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [items]);

  const sizeStats = useMemo(() => {
    const map = new Map<string, { product: string; size: string; units: number }>();
    items.forEach((i) => {
      const product = itemDisplayName(i);
      const size = itemSize(i);
      const key = `${product}|||${size}`;
      const c = map.get(key) ?? { product, size, units: 0 };
      c.units += Number(i.quantity);
      map.set(key, c);
    });
    return Array.from(map.values()).sort((a, b) => a.product.localeCompare(b.product) || a.size.localeCompare(b.size));
  }, [items]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; orders: number }>();
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      const cur = map.get(key) ?? { month: label, revenue: 0, orders: 0 };
      cur.revenue += Number(o.total);
      cur.orders += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [orders]);

  const exportProductCSV = () => {
    downloadCSV(
      `${store.name}-product-breakdown.csv`,
      ["Product", "SKU", "Units Sold", "Sales"],
      productStats.map((p) => [p.name, p.sku, p.units, p.sales.toFixed(2)])
    );
  };

  const exportSizeCSV = () => {
    downloadCSV(
      `${store.name}-size-breakdown.csv`,
      ["Product", "Size", "Units Sold"],
      sizeStats.map((s) => [s.product, s.size, s.units])
    );
  };

  const kpis = [
    { label: "Total Orders", value: totalOrders.toLocaleString(), icon: ShoppingCart },
    { label: "Items Sold", value: totalUnits.toLocaleString(), icon: Package },
    { label: "Gross Sales", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign },
    ...(refunds.length > 0 ? [{ label: "Net Sales", value: `$${netRevenue.toFixed(2)}`, icon: TrendingUp }] : []),
    { label: "Avg Order", value: `$${avgOrder.toFixed(2)}`, icon: TrendingUp },
    ...(store.fundraising_percent ? [{ label: "Funds Raised", value: `$${fundraisingRaised.toFixed(2)}`, icon: Heart }] : []),
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Store Summary</h3>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
              <p className="text-xl font-bold text-foreground">{isLoading ? "…" : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {monthlyData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Sales Over Time</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value: number, name: string) => name === "revenue" ? [`$${value.toFixed(2)}`, "Revenue"] : [value, "Orders"]} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Breakdown */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Product Breakdown</CardTitle>
          <Button variant="outline" size="sm" onClick={exportProductCSV} disabled={productStats.length === 0}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : productStats.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No data.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productStats.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="text-xs font-mono">{p.sku}</TableCell>
                      <TableCell className="text-right text-sm">{p.units}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${p.sales.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Size Breakdown */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Size Breakdown</CardTitle>
          <Button variant="outline" size="sm" onClick={exportSizeCSV} disabled={sizeStats.length === 0}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : sizeStats.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No data.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sizeStats.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{s.product}</TableCell>
                      <TableCell className="text-sm">{s.size}</TableCell>
                      <TableCell className="text-right text-sm">{s.units}</TableCell>
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
