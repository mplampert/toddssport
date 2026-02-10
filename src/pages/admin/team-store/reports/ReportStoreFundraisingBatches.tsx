import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Heart, DollarSign } from "lucide-react";
import { downloadCSV } from "@/hooks/useStoreReportData";

interface BatchData {
  id: string;
  batch_type: string;
  created_at: string;
  cutoff_datetime: string;
  order_ids: string[];
  status: string;
}

interface OrderData {
  id: string;
  total: number;
  created_at: string;
}

interface PayoutData {
  id: string;
  amount: number;
}

export default function ReportStoreFundraisingBatches() {
  const ctx = useTeamStoreContext();
  const store = ctx.store;
  const storeId = store.id;
  const rate = (store as any).fundraising_percent ?? 0;

  const { data: batches = [], isLoading: batchLoading } = useQuery<BatchData[]>({
    queryKey: ["fundraising-batches", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fulfillment_batches")
        .select("id, batch_type, created_at, cutoff_datetime, order_ids, status")
        .eq("team_store_id", storeId)
        .order("created_at", { ascending: false });
      return (data ?? []) as BatchData[];
    },
  });

  const allOrderIds = useMemo(() => {
    const ids = new Set<string>();
    batches.forEach((b) => b.order_ids.forEach((id) => ids.add(id)));
    return Array.from(ids);
  }, [batches]);

  const { data: orders = [] } = useQuery<OrderData[]>({
    queryKey: ["fundraising-batch-orders", storeId, allOrderIds.length],
    queryFn: async () => {
      if (allOrderIds.length === 0) return [];
      const all: OrderData[] = [];
      for (let i = 0; i < allOrderIds.length; i += 500) {
        const batch = allOrderIds.slice(i, i + 500);
        const { data } = await supabase
          .from("team_store_orders")
          .select("id, total, created_at")
          .in("id", batch)
          .neq("status", "cancelled");
        if (data) all.push(...(data as OrderData[]));
      }
      return all;
    },
    enabled: allOrderIds.length > 0,
  });

  const { data: payouts = [] } = useQuery<PayoutData[]>({
    queryKey: ["fundraising-payouts", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fundraising_payouts")
        .select("id, amount")
        .eq("team_store_id", storeId);
      return (data ?? []) as PayoutData[];
    },
  });

  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const totalPaidOut = payouts.reduce((s, p) => s + Number(p.amount), 0);

  const batchRows = useMemo(() => {
    // Distribute payouts proportionally across batches by raised amount
    const rows = batches.map((b) => {
      const batchOrders = b.order_ids
        .map((id) => orderMap.get(id))
        .filter(Boolean) as OrderData[];
      const sales = batchOrders.reduce((s, o) => s + Number(o.total), 0);
      const raised = sales * (rate / 100);
      const dates = batchOrders.map((o) => o.created_at).sort();
      const firstOrder = dates[0] ?? null;
      const lastOrder = dates[dates.length - 1] ?? null;
      return {
        ...b,
        orderCount: batchOrders.length,
        sales,
        raised,
        firstOrder,
        lastOrder,
      };
    });

    // Simple proportional payout allocation
    const totalRaised = rows.reduce((s, r) => s + r.raised, 0);
    return rows.map((r) => {
      const proportion = totalRaised > 0 ? r.raised / totalRaised : 0;
      const allocated = totalPaidOut * proportion;
      const remaining = r.raised - allocated;
      let payoutStatus: "not_paid" | "partially_paid" | "paid" = "not_paid";
      if (allocated > 0 && remaining > 0.01) payoutStatus = "partially_paid";
      else if (allocated > 0 && remaining <= 0.01) payoutStatus = "paid";
      return { ...r, paidAllocated: allocated, remaining, payoutStatus };
    });
  }, [batches, orderMap, rate, totalPaidOut]);

  const totalSales = batchRows.reduce((s, r) => s + r.sales, 0);
  const totalRaised = batchRows.reduce((s, r) => s + r.raised, 0);

  const handleExport = () => {
    const headers = ["Batch ID", "Type", "Created", "Date Range", "Orders", "Sales", "Raised", "Payout Status"];
    const csvRows = batchRows.map((r) => [
      r.id.slice(0, 8),
      r.batch_type === "manual" ? "Forced" : "Scheduled",
      new Date(r.created_at).toLocaleDateString(),
      r.firstOrder && r.lastOrder
        ? `${new Date(r.firstOrder).toLocaleDateString()} – ${new Date(r.lastOrder).toLocaleDateString()}`
        : "—",
      r.orderCount,
      r.sales.toFixed(2),
      r.raised.toFixed(2),
      r.payoutStatus === "paid" ? "Paid" : r.payoutStatus === "partially_paid" ? "Partial" : "Not Paid",
    ]);
    downloadCSV(`fundraising-batches-${storeId.slice(0, 8)}.csv`, headers, csvRows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/team-stores/fundraising">
            <ArrowLeft className="w-4 h-4 mr-1" /> Fundraising
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{store.name} — Fundraising by Batch</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fundraising breakdown per fulfillment batch · Rate: {rate}%
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={batchRows.length === 0}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sales", value: `$${totalSales.toFixed(2)}`, icon: DollarSign },
          { label: "Total Raised", value: `$${totalRaised.toFixed(2)}`, icon: Heart },
          { label: "Total Paid Out", value: `$${totalPaidOut.toFixed(2)}`, icon: DollarSign },
          { label: "Batches", value: batchRows.length.toString(), icon: DollarSign },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{batchLoading ? "…" : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {batchLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : batchRows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No batches found for this store.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Raised</TableHead>
                    <TableHead>Payout Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchRows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm font-mono">{b.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">
                        {b.batch_type === "manual" ? "Forced" : "Scheduled"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(b.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {b.firstOrder && b.lastOrder
                          ? `${new Date(b.firstOrder).toLocaleDateString()} – ${new Date(b.lastOrder).toLocaleDateString()}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">{b.orderCount}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${b.sales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">${b.raised.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={b.payoutStatus === "paid" ? "default" : b.payoutStatus === "partially_paid" ? "outline" : "secondary"}
                        >
                          {b.payoutStatus === "paid" ? "Paid" : b.payoutStatus === "partially_paid" ? "Partial" : "Not Paid"}
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
