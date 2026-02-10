import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, Download, Truck } from "lucide-react";

export default function ReportFulfillment() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["report-fulfillment-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, order_number, store_id, total, status, fulfillment_status, created_at")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["report-fulfillment-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("team_stores").select("id, name").order("name");
      return data ?? [];
    },
  });

  const storeMap = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s: any) => m.set(s.id, s.name));
    return m;
  }, [stores]);

  const filtered = useMemo(() => {
    return orders.filter((o: any) => {
      if (search) {
        const q = search.toLowerCase();
        const storeName = storeMap.get(o.store_id) ?? "";
        if (!o.order_number?.toLowerCase().includes(q) && !storeName.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && o.fulfillment_status !== statusFilter) return false;
      if (storeFilter !== "all" && o.store_id !== storeFilter) return false;
      if (dateFrom && o.created_at < dateFrom) return false;
      if (dateTo && o.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [orders, search, statusFilter, storeFilter, dateFrom, dateTo, storeMap]);

  const hasFilters = search || statusFilter !== "all" || storeFilter !== "all" || dateFrom || dateTo;

  const statusLabel = (s: string) => {
    switch (s) {
      case "unfulfilled": return "New";
      case "in_production": return "In Production";
      case "ready_to_ship": return "Ready to Ship";
      case "fulfilled": return "Shipped";
      default: return s?.replace(/_/g, " ") ?? "—";
    }
  };

  const exportCSV = () => {
    const headers = ["Order ID", "Store", "Date", "Status", "Total"];
    const rows = filtered.map((o: any) => [
      o.order_number, storeMap.get(o.store_id) ?? "", new Date(o.created_at).toLocaleDateString(),
      statusLabel(o.fulfillment_status), Number(o.total).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fulfillment-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open Orders", value: filtered.filter((o: any) => o.fulfillment_status !== "fulfilled").length },
          { label: "Ready to Ship", value: filtered.filter((o: any) => o.fulfillment_status === "ready_to_ship").length },
          { label: "In Production", value: filtered.filter((o: any) => o.fulfillment_status === "in_production").length },
          { label: "Total Shown", value: filtered.length },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "…" : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search order or store…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unfulfilled">New</SelectItem>
            <SelectItem value="in_production">In Production</SelectItem>
            <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
            <SelectItem value="fulfilled">Shipped</SelectItem>
          </SelectContent>
        </Select>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Store" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setStoreFilter("all"); setDateFrom(""); setDateTo(""); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders match filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o: any) => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/team-stores/${o.store_id}/orders/${o.id}`)}
                    >
                      <TableCell className="font-medium text-sm">{o.order_number}</TableCell>
                      <TableCell className="text-sm">{storeMap.get(o.store_id) ?? "—"}</TableCell>
                      <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={o.fulfillment_status === "fulfilled" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {statusLabel(o.fulfillment_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">{o.status}</Badge>
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
