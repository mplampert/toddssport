import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import PersonalizationReport from "./PersonalizationReport";

type ReportTab = "sales" | "personalization";

interface StoreRow {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  fundraising_percent: number | null;
}

interface OrderRow {
  id: string;
  store_id: string;
  total: number;
  status: string;
  created_at: string;
}

export default function TeamStoresReports() {
  const [tab, setTab] = useState<ReportTab>("sales");

  const { data: stores = [] } = useQuery<StoreRow[]>({
    queryKey: ["reports-stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_stores")
        .select("id, name, status, start_date, end_date, fundraising_percent")
        .order("name");
      return (data ?? []) as StoreRow[];
    },
  });

  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["reports-all-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, store_id, total, status, created_at")
        .order("created_at", { ascending: true });
      return (data ?? []) as OrderRow[];
    },
  });

  const storeStats = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>();
    orders.forEach((o) => {
      const cur = map.get(o.store_id) ?? { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.total);
      map.set(o.store_id, cur);
    });
    return stores.map((s) => {
      const stat = map.get(s.id) ?? { orders: 0, revenue: 0 };
      const fundraisingRaised = s.fundraising_percent
        ? stat.revenue * (s.fundraising_percent / 100)
        : 0;
      return {
        ...s,
        totalOrders: stat.orders,
        totalRevenue: stat.revenue,
        avgOrderValue: stat.orders > 0 ? stat.revenue / stat.orders : 0,
        fundraisingRaised,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [stores, orders]);

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
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [orders]);

  const totalRevenue = storeStats.reduce((s, r) => s + r.totalRevenue, 0);
  const totalOrders = orders.length;
  const totalFundraising = storeStats.reduce((s, r) => s + r.fundraisingRaised, 0);

  const tabs: { value: ReportTab; label: string }[] = [
    { value: "sales", label: "Sales" },
    { value: "personalization", label: "Personalization" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sales performance and production data across all team stores.
        </p>
      </div>

      {/* Report Tabs */}
      <nav className="flex border-b border-border gap-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.value
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "personalization" ? (
        <PersonalizationReport />
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
              { label: "Total Orders", value: totalOrders.toLocaleString() },
              { label: "Active Stores", value: storeStats.filter((s) => s.status === "open").length.toString() },
              { label: "Fundraising Raised", value: `$${totalFundraising.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-2xl font-bold text-foreground">{isLoading ? "…" : k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sales Over Time Chart */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === "revenue" ? [`$${value.toFixed(2)}`, "Revenue"] : [value, "Orders"]
                        }
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="orders" name="Orders" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales by Store Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sales by Store</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading…</p>
              ) : storeStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No stores yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Avg Order</TableHead>
                        <TableHead className="text-right">Fundraising</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeStats.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-sm">{s.name}</TableCell>
                          <TableCell>
                            <Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{s.totalOrders}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            ${s.totalRevenue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            ${s.avgOrderValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {s.fundraising_percent
                              ? `$${s.fundraisingRaised.toFixed(2)} (${s.fundraising_percent}%)`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
