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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Truck, Heart, Search, X, AlertCircle, Package, DollarSign } from "lucide-react";

interface StoreRow {
  id: string;
  name: string;
  status: string | null;
  organization: string | null;
  season: string | null;
  fundraising_percent: number | null;
}

export default function TeamStoresProcessing() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [needsFulfillment, setNeedsFulfillment] = useState(true);
  const [needsPayout, setNeedsPayout] = useState(true);
  const [orgFilter, setOrgFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stores = [] } = useQuery<StoreRow[]>({
    queryKey: ["processing-stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_stores")
        .select("id, name, status, organization, season, fundraising_percent")
        .order("name");
      return (data ?? []) as StoreRow[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["processing-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, store_id, total, created_at")
        .neq("status", "cancelled");
      return data ?? [];
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["processing-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fulfillment_batches")
        .select("id, team_store_id, order_ids, status, created_at");
      return data ?? [];
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["processing-payouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fundraising_payouts")
        .select("id, team_store_id, amount");
      return data ?? [];
    },
  });

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

  const rows = useMemo(() => {
    // Build batch info per store (only open batches)
    const batchMap = new Map<string, { openBatches: number; openItems: number; lastBatchDate: string }>();
    batches.forEach((b: any) => {
      if (b.status !== "ready" && b.status !== "in_production") return;
      const entry = batchMap.get(b.team_store_id) ?? { openBatches: 0, openItems: 0, lastBatchDate: "" };
      entry.openBatches += 1;
      entry.openItems += (b.order_ids?.length ?? 0);
      if (b.created_at > entry.lastBatchDate) entry.lastBatchDate = b.created_at;
      batchMap.set(b.team_store_id, entry);
    });

    // Build sales & last order date per store
    const salesMap = new Map<string, { total: number; lastOrder: string }>();
    orders.forEach((o: any) => {
      const entry = salesMap.get(o.store_id) ?? { total: 0, lastOrder: "" };
      entry.total += Number(o.total ?? 0);
      if (o.created_at > entry.lastOrder) entry.lastOrder = o.created_at;
      salesMap.set(o.store_id, entry);
    });

    // Build payout totals
    const payoutMap = new Map<string, number>();
    payouts.forEach((p: any) => {
      payoutMap.set(p.team_store_id, (payoutMap.get(p.team_store_id) ?? 0) + Number(p.amount));
    });

    return stores.map((s) => {
      const bi = batchMap.get(s.id);
      const si = salesMap.get(s.id);
      const paidOut = payoutMap.get(s.id) ?? 0;
      const totalSales = si?.total ?? 0;
      const fundsRaised = totalSales * ((s.fundraising_percent ?? 0) / 100);
      const fundsRemaining = Math.max(0, fundsRaised - paidOut);

      const hasOpenBatches = (bi?.openBatches ?? 0) > 0;
      const needsPayoutFlag = s.status === "closed" && fundsRemaining > 0.01;

      // Last activity = most recent of last order or last batch
      const lastOrder = si?.lastOrder ?? "";
      const lastBatch = bi?.lastBatchDate ?? "";
      const lastActivity = lastOrder > lastBatch ? lastOrder : lastBatch;

      return {
        ...s,
        openBatches: bi?.openBatches ?? 0,
        openItems: bi?.openItems ?? 0,
        fundsRemaining,
        lastActivity,
        hasOpenBatches,
        needsPayoutFlag,
        qualifies: hasOpenBatches || needsPayoutFlag,
      };
    }).filter((r) => r.qualifies);
  }, [stores, orders, batches, payouts]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // Toggle filters
      if (needsFulfillment && !needsPayout && !r.hasOpenBatches) return false;
      if (!needsFulfillment && needsPayout && !r.needsPayoutFlag) return false;
      if (needsFulfillment && needsPayout && !r.hasOpenBatches && !r.needsPayoutFlag) return false;

      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !(r.organization ?? "").toLowerCase().includes(q)) return false;
      }
      if (orgFilter !== "all" && r.organization !== orgFilter) return false;
      if (seasonFilter !== "all" && r.season !== seasonFilter) return false;
      if (dateFrom && r.lastActivity && r.lastActivity < dateFrom) return false;
      if (dateTo && r.lastActivity && r.lastActivity > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [rows, search, needsFulfillment, needsPayout, orgFilter, seasonFilter, dateFrom, dateTo]);

  const totalOpenBatches = filtered.reduce((s, r) => s + r.openBatches, 0);
  const totalNeedingPayout = filtered.filter((r) => r.needsPayoutFlag).length;
  const totalFundsRemaining = filtered.reduce((s, r) => s + r.fundsRemaining, 0);

  const statusLabel = (status: string | null) => {
    if (status === "open") return "Live";
    if (status === "closed") return "Closed";
    return "Not Launched";
  };

  const hasFilters = search || orgFilter !== "all" || seasonFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-accent" /> Processing Queue
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Stores that need fulfillment or fundraising payouts. When a store disappears, you're caught up.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Open Batches</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalOpenBatches}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Stores Needing Payout</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalNeedingPayout}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Funds Remaining</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ${totalFundsRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toggles + Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <Switch id="needsFulfillment" checked={needsFulfillment} onCheckedChange={setNeedsFulfillment} />
          <Label htmlFor="needsFulfillment" className="text-sm cursor-pointer">Needs Fulfillment</Label>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <Switch id="needsPayout" checked={needsPayout} onCheckedChange={setNeedsPayout} />
          <Label htmlFor="needsPayout" className="text-sm cursor-pointer">Needs Payout</Label>
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stores…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        {orgOptions.length > 0 && (
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Organization" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {orgOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {seasonOptions.length > 0 && (
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Season" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasonOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9" />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setOrgFilter("all"); setSeasonFilter("all"); setDateFrom(""); setDateTo(""); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No stores need fulfillment or payouts right now.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Open Batches</TableHead>
                    <TableHead className="text-right">Items in Batches</TableHead>
                    <TableHead className="text-right">Funds Remaining</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Needs</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.organization ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.season ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "open" ? "default" : "secondary"}>
                          {statusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{r.openBatches || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{r.openItems || "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {r.fundsRemaining > 0.01 ? `$${r.fundsRemaining.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.lastActivity ? new Date(r.lastActivity).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.hasOpenBatches && (
                            <Badge variant="outline" className="text-xs">Fulfillment</Badge>
                          )}
                          {r.needsPayoutFlag && (
                            <Badge variant="outline" className="text-xs">Payout</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.hasOpenBatches && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => navigate(`/admin/team-stores/${r.id}/fulfillment`)}
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" /> Fulfillment
                            </Button>
                          )}
                          {r.needsPayoutFlag && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => navigate(`/admin/team-stores/${r.id}/reports/fundraising`)}
                            >
                              <Heart className="w-3.5 h-3.5 mr-1" /> Fundraising
                            </Button>
                          )}
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
