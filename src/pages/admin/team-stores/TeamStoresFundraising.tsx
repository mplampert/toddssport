import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heart, DollarSign, Search, X, Eye, Layers, Download } from "lucide-react";
import { downloadCSV } from "@/hooks/useStoreReportData";

interface StoreRow {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  fundraising_percent: number | null;
  sport: string | null;
  organization: string | null;
  season: string | null;
}

interface OrderRow {
  id: string;
  store_id: string;
  total: number;
  status: string;
}

interface PayoutRow {
  id: string;
  team_store_id: string;
  amount: number;
}

interface BatchRow {
  id: string;
  team_store_id: string;
}

export default function TeamStoresFundraising() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("closed");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stores = [] } = useQuery<StoreRow[]>({
    queryKey: ["fundraising-stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_stores")
        .select("id, name, status, start_date, end_date, fundraising_percent, sport, organization, season")
        .order("name");
      return (data ?? []) as StoreRow[];
    },
  });

  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["fundraising-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, store_id, total, status")
        .neq("status", "cancelled");
      return (data ?? []) as OrderRow[];
    },
  });

  const { data: payouts = [] } = useQuery<PayoutRow[]>({
    queryKey: ["fundraising-payouts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fundraising_payouts")
        .select("id, team_store_id, amount");
      return (data ?? []) as PayoutRow[];
    },
  });

  const { data: batches = [] } = useQuery<BatchRow[]>({
    queryKey: ["fundraising-batches-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fulfillment_batches")
        .select("id, team_store_id");
      return (data ?? []) as BatchRow[];
    },
  });

  // Unique filter options
  const orgOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => { if (s.organization) set.add(s.organization); });
    return Array.from(set).sort();
  }, [stores]);

  const seasonOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => { if (s.season) set.add(s.season); });
    return Array.from(set).sort();
  }, [stores]);

  const storeStats = useMemo(() => {
    const orderMap = new Map<string, { count: number; revenue: number }>();
    orders.forEach((o) => {
      const c = orderMap.get(o.store_id) ?? { count: 0, revenue: 0 };
      c.count += 1;
      c.revenue += Number(o.total);
      orderMap.set(o.store_id, c);
    });

    const payoutMap = new Map<string, number>();
    payouts.forEach((p) => {
      payoutMap.set(p.team_store_id, (payoutMap.get(p.team_store_id) ?? 0) + Number(p.amount));
    });

    const batchMap = new Map<string, number>();
    batches.forEach((b) => {
      batchMap.set(b.team_store_id, (batchMap.get(b.team_store_id) ?? 0) + 1);
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

        return {
          ...s,
          totalSales: stat.revenue,
          totalOrders: stat.count,
          raised,
          paid,
          remaining,
          payoutStatus,
          batchCount: batchMap.get(s.id) ?? 0,
        };
      });
  }, [stores, orders, payouts, batches]);

  const filtered = useMemo(() => {
    return storeStats.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all") {
        const storeStatus = (s.status ?? "draft").toLowerCase();
        if (statusFilter === "closed" && storeStatus !== "closed") return false;
        if (statusFilter === "open" && storeStatus !== "open") return false;
        if (statusFilter === "scheduled" && storeStatus !== "scheduled") return false;
        if (statusFilter === "draft" && storeStatus !== "draft") return false;
      }
      if (orgFilter !== "all" && s.organization !== orgFilter) return false;
      if (seasonFilter !== "all" && s.season !== seasonFilter) return false;
      if (dateFrom && s.end_date && s.end_date < dateFrom) return false;
      if (dateTo && s.end_date && s.end_date > dateTo) return false;
      return true;
    });
  }, [storeStats, search, statusFilter, orgFilter, seasonFilter, dateFrom, dateTo]);

  const totalRaised = filtered.reduce((s, r) => s + r.raised, 0);
  const totalPaid = filtered.reduce((s, r) => s + r.paid, 0);
  const totalRemaining = filtered.reduce((s, r) => s + r.remaining, 0);
  const totalSales = filtered.reduce((s, r) => s + r.totalSales, 0);

  const hasFilters = search || statusFilter !== "closed" || orgFilter !== "all" || seasonFilter !== "all" || dateFrom || dateTo;

  const handleExportCSV = () => {
    const headers = ["Store", "Organization", "Season", "Status", "Total Sales", "Funds Raised", "Paid Out", "Remaining", "Batches"];
    const rows = filtered.map((s) => [
      s.name, s.organization ?? "", s.season ?? "", s.status ?? "draft",
      s.totalSales.toFixed(2), s.raised.toFixed(2), s.paid.toFixed(2), s.remaining.toFixed(2),
      s.batchCount,
    ]);
    downloadCSV("fundraising-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fundraising</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track funds raised and payout status across all stores with fundraising enabled.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

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
          <Input
            placeholder="Search stores…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
          </SelectContent>
        </Select>
        {orgOptions.length > 0 && (
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {orgOptions.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {seasonOptions.length > 0 && (
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasonOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
          placeholder="Close from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
          placeholder="Close to"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("closed"); setOrgFilter("all"); setSeasonFilter("all"); setDateFrom(""); setDateTo(""); }}>
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
            <p className="text-sm text-muted-foreground p-6">
              {storeStats.length === 0
                ? "No stores have fundraising enabled yet."
                : "No stores match the current filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Funds Raised</TableHead>
                    <TableHead className="text-right">Paid Out</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.organization ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.season ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "open" ? "default" : "secondary"} className="capitalize">
                          {s.status ?? "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${s.totalSales.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${s.raised.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${s.paid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${s.remaining.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{s.batchCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => navigate(`/admin/team-stores/${s.id}/reports/fundraising`)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Store
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => navigate(`/admin/team-stores/${s.id}/reports/fundraising-batches`)}
                          >
                            <Layers className="w-3.5 h-3.5 mr-1" /> Batches
                          </Button>
                        </div>
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
