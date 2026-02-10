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
import { Heart, DollarSign, Search, X, Download } from "lucide-react";

interface StoreRow {
  id: string;
  name: string;
  sport: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  fundraising_percent: number | null;
  mascot_name: string | null;
}

interface OrderRow {
  id: string;
  store_id: string;
  total: number;
  status: string;
  created_at: string;
}

interface PayoutRow {
  id: string;
  team_store_id: string;
  amount: number;
}

export default function ReportFundraising() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stores = [] } = useQuery<StoreRow[]>({
    queryKey: ["report-fundraising-stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_stores")
        .select("id, name, mascot_name, sport, status, start_date, end_date, fundraising_percent")
        .order("name");
      return (data ?? []) as StoreRow[];
    },
  });

  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["report-fundraising-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, store_id, total, status, created_at")
        .neq("status", "cancelled");
      return (data ?? []) as OrderRow[];
    },
  });

  const { data: payouts = [] } = useQuery<PayoutRow[]>({
    queryKey: ["report-fundraising-payouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fundraising_payouts")
        .select("id, team_store_id, amount");
      return (data ?? []) as PayoutRow[];
    },
  });

  const storeStats = useMemo(() => {
    const orderMap = new Map<string, { count: number; revenue: number }>();
    orders.forEach((o) => {
      if (dateFrom && o.created_at < dateFrom) return;
      if (dateTo && o.created_at > dateTo + "T23:59:59") return;
      const c = orderMap.get(o.store_id) ?? { count: 0, revenue: 0 };
      c.count += 1;
      c.revenue += Number(o.total);
      orderMap.set(o.store_id, c);
    });

    const payoutMap = new Map<string, number>();
    payouts.forEach((p) => {
      payoutMap.set(p.team_store_id, (payoutMap.get(p.team_store_id) ?? 0) + Number(p.amount));
    });

    return stores
      .filter((s) => s.fundraising_percent && s.fundraising_percent > 0)
      .map((s) => {
        const stat = orderMap.get(s.id) ?? { count: 0, revenue: 0 };
        const raised = stat.revenue * ((s.fundraising_percent ?? 0) / 100);
        const paid = payoutMap.get(s.id) ?? 0;
        const remaining = raised - paid;
        let payoutStatus: "not_paid" | "partially_paid" | "paid" = "not_paid";
        if (paid > 0 && remaining > 0.01) payoutStatus = "partially_paid";
        else if (paid > 0 && remaining <= 0.01) payoutStatus = "paid";

        const storeStatus = s.status === "open" ? "Live" : s.status === "closed" ? "Closed" : "Not launched";

        return {
          ...s,
          storeStatus,
          totalSales: stat.revenue,
          totalOrders: stat.count,
          raised,
          paid,
          remaining,
          payoutStatus,
        };
      });
  }, [stores, orders, payouts, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return storeStats.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !(s.mascot_name ?? "").toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [storeStats, search, statusFilter]);

  const totalRaised = filtered.reduce((s, r) => s + r.raised, 0);
  const totalPaid = filtered.reduce((s, r) => s + r.paid, 0);
  const totalRemaining = filtered.reduce((s, r) => s + r.remaining, 0);
  const totalSales = filtered.reduce((s, r) => s + r.totalSales, 0);

  const hasFilters = search || statusFilter !== "all" || dateFrom || dateTo;

  const exportCSV = () => {
    const headers = ["Store", "Organization", "Season", "Open Date", "Close Date", "Status", "Orders", "Total Sales", "Funds Raised", "Paid Out", "Remaining", "Payout Status"];
    const rows = filtered.map((s) => [
      s.name, s.mascot_name ?? "", s.sport ?? "", s.start_date ?? "", s.end_date ?? "",
      s.storeStatus, s.totalOrders.toString(), s.totalSales.toFixed(2), s.raised.toFixed(2),
      s.paid.toFixed(2), s.remaining.toFixed(2),
      s.payoutStatus === "paid" ? "Paid" : s.payoutStatus === "partially_paid" ? "Partial" : "Not Paid",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fundraising-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sales", value: `$${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign },
          { label: "Funds Raised", value: `$${totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Heart },
          { label: "Paid Out", value: `$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign },
          { label: "Remaining", value: `$${totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign },
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

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stores or orgs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No stores match filters.</p>
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
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Raised</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/team-stores/fundraising/${s.id}`)}>
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.mascot_name ?? "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{s.sport ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.start_date ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.end_date ?? "—"}</TableCell>
                      <TableCell><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.storeStatus}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{s.totalOrders}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${s.totalSales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${s.raised.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">${s.paid.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">${s.remaining.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={s.payoutStatus === "paid" ? "default" : s.payoutStatus === "partially_paid" ? "outline" : "secondary"}>
                          {s.payoutStatus === "paid" ? "Paid" : s.payoutStatus === "partially_paid" ? "Partial" : "Not Paid"}
                        </Badge>
                      </TableCell>
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
