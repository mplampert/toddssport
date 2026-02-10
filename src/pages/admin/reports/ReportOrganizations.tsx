import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, Download, Building2 } from "lucide-react";

export default function ReportOrganizations() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stores = [] } = useQuery({
    queryKey: ["report-orgs-stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_stores")
        .select("id, name, mascot_name, sport, start_date, fundraising_percent")
        .order("name");
      return data ?? [];
    },
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["report-orgs-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, store_id, total, created_at, status")
        .neq("status", "cancelled");
      return data ?? [];
    },
  });

  const orgStats = useMemo(() => {
    const orderMap = new Map<string, { count: number; revenue: number }>();
    orders.forEach((o: any) => {
      if (dateFrom && o.created_at < dateFrom) return;
      if (dateTo && o.created_at > dateTo + "T23:59:59") return;
      const c = orderMap.get(o.store_id) ?? { count: 0, revenue: 0 };
      c.count += 1;
      c.revenue += Number(o.total);
      orderMap.set(o.store_id, c);
    });

    // Group by mascot_name as organization proxy
    const orgMap = new Map<string, {
      name: string;
      storeCount: number;
      totalOrders: number;
      totalSales: number;
      totalRaised: number;
      lastOpen: string | null;
    }>();

    stores.forEach((s: any) => {
      const orgName = s.mascot_name || s.name;
      const c = orgMap.get(orgName) ?? { name: orgName, storeCount: 0, totalOrders: 0, totalSales: 0, totalRaised: 0, lastOpen: null };
      c.storeCount += 1;
      const stat = orderMap.get(s.id) ?? { count: 0, revenue: 0 };
      c.totalOrders += stat.count;
      c.totalSales += stat.revenue;
      c.totalRaised += stat.revenue * ((s.fundraising_percent ?? 0) / 100);
      if (s.start_date && (!c.lastOpen || s.start_date > c.lastOpen)) c.lastOpen = s.start_date;
      orgMap.set(orgName, c);
    });

    return Array.from(orgMap.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [stores, orders, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!search) return orgStats;
    const q = search.toLowerCase();
    return orgStats.filter((o) => o.name.toLowerCase().includes(q));
  }, [orgStats, search]);

  const hasFilters = search || dateFrom || dateTo;

  const exportCSV = () => {
    const headers = ["Organization", "Stores", "Orders", "Sales", "Funds Raised", "Last Open"];
    const rows = filtered.map((o) => [
      o.name, o.storeCount.toString(), o.totalOrders.toString(),
      o.totalSales.toFixed(2), o.totalRaised.toFixed(2), o.lastOpen ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizations-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search organization…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No organizations found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Stores</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Funds Raised</TableHead>
                    <TableHead>Last Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.name}>
                      <TableCell className="font-medium text-sm">{o.name}</TableCell>
                      <TableCell className="text-right text-sm">{o.storeCount}</TableCell>
                      <TableCell className="text-right text-sm">{o.totalOrders}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${o.totalSales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">${o.totalRaised.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{o.lastOpen ?? "—"}</TableCell>
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
