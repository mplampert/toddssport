import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, Download } from "lucide-react";

export default function ReportStores() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stores = [] } = useQuery({
    queryKey: ["report-stores-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_stores")
        .select("id, name, mascot_name, sport, status, start_date, end_date")
        .order("name");
      return data ?? [];
    },
  });

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ["report-stores-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, store_id, total, status, created_at");
      return data ?? [];
    },
  });

  const storeStats = useMemo(() => {
    const map = new Map<string, { orders: number; gross: number }>();
    allOrders.forEach((o: any) => {
      if (dateFrom && o.created_at < dateFrom) return;
      if (dateTo && o.created_at > dateTo + "T23:59:59") return;
      const c = map.get(o.store_id) ?? { orders: 0, gross: 0 };
      c.orders += 1;
      c.gross += Number(o.total ?? 0);
      map.set(o.store_id, c);
    });

    return stores.map((s: any) => {
      const stat = map.get(s.id) ?? { orders: 0, gross: 0 };
      const storeStatus = s.status === "open" ? "Live" : s.status === "closed" ? "Closed" : "Not launched";
      return { ...s, storeStatus, orders: stat.orders, gross: stat.gross };
    });
  }, [stores, allOrders, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return storeStats.filter((s: any) => {
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !(s.mascot_name ?? "").toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    }).sort((a: any, b: any) => b.gross - a.gross);
  }, [storeStats, search, statusFilter]);

  const hasFilters = search || statusFilter !== "all" || dateFrom || dateTo;

  const exportCSV = () => {
    const headers = ["Store", "Organization", "Season", "Open", "Close", "Status", "Orders", "Gross Sales"];
    const rows = filtered.map((s: any) => [
      s.name, s.mascot_name ?? "", s.sport ?? "", s.start_date ?? "", s.end_date ?? "",
      s.storeStatus, s.orders, s.gross.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stores-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stores…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Live</SelectItem>
            <SelectItem value="scheduled">Not launched</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s: any) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/team-stores/${s.id}`)}>
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.mascot_name ?? "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{s.sport ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.start_date ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.end_date ?? "—"}</TableCell>
                      <TableCell><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.storeStatus}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{s.orders}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${s.gross.toFixed(2)}</TableCell>
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
