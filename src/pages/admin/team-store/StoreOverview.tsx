import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Package, ShoppingCart, DollarSign, Calendar, Heart,
  ExternalLink, Plus, Palette, ShoppingBag,
  Clock, CheckCircle2, Factory, Truck, XCircle,
  Rocket, CreditCard, AlertCircle,
} from "lucide-react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";

import { useMemo } from "react";
import { toast } from "sonner";

/* ─── Helpers ─── */

function computeStatus(store: { active: boolean; status: string | null; start_date: string | null; end_date: string | null }) {
  const now = new Date();
  const start = store.start_date ? new Date(store.start_date) : null;
  const end = store.end_date ? new Date(store.end_date) : null;

  if (store.status === "closed" || (!store.active && end && now > end))
    return { label: "Closed", variant: "destructive" as const, color: "text-destructive" };
  if (store.status === "draft" || (!store.active && !start))
    return { label: "Draft", variant: "secondary" as const, color: "text-muted-foreground" };
  if (start && now < start)
    return { label: "Scheduled", variant: "outline" as const, color: "text-accent" };
  if (store.active || store.status === "open")
    return { label: "Live", variant: "default" as const, color: "text-green-600" };
  return { label: "Inactive", variant: "secondary" as const, color: "text-muted-foreground" };
}

function daysUntil(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Today";
  return `${diff} day${diff !== 1 ? "s" : ""}`;
}

interface OrderRow {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  fulfillment_status: string;
}

interface PaymentRow {
  amount: number;
  type: string;
}

/* ─── Component ─── */

export default function StoreOverview() {
  const queryClient = useQueryClient();
  const { store } = useTeamStoreContext();
  const status = computeStatus(store);

  const launchMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({ status: "open", active: true } as any)
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Store launched! It's now live.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({ status: "closed", active: false } as any)
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Store closed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Schedule messaging
  const opensIn = status.label === "Scheduled" ? daysUntil(store.start_date) : null;
  const closesIn = status.label === "Live" ? daysUntil(store.end_date) : null;

  /* ── Data queries ── */

  const { data: productCount = 0 } = useQuery({
    queryKey: ["store-overview-products", store.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("team_store_products")
        .select("id", { count: "exact", head: true })
        .eq("team_store_id", store.id);
      return count ?? 0;
    },
  });

  const { data: orders = [] } = useQuery<OrderRow[]>({
    queryKey: ["store-overview-orders", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("id, status, total, subtotal, fulfillment_status")
        .eq("store_id", store.id)
        .eq("is_sample", false);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const { data: payments = [] } = useQuery<PaymentRow[]>({
    queryKey: ["store-overview-payments", store.id],
    queryFn: async () => {
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length === 0) return [];
      const { data, error } = await supabase
        .from("team_store_payments")
        .select("amount, type")
        .in("order_id", orderIds);
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
    enabled: orders.length > 0,
  });

  /* ── Computed metrics ── */

  const metrics = useMemo(() => {
    const grossSales = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalPaid = payments
      .filter((p) => p.type === "payment")
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalRefunds = payments
      .filter((p) => p.type === "refund")
      .reduce((s, p) => s + Number(p.amount), 0);
    const netPaid = totalPaid - totalRefunds;
    const balanceDue = Math.max(0, grossSales - netPaid);

    const fundraisingPct = store.fundraising_percent ?? 0;
    const fundraisingGoal = store.fundraising_goal_amount ?? store.fundraising_goal ?? 0;
    const eligibleSales = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.subtotal), 0);
    const fundraisingRaised = eligibleSales * (fundraisingPct / 100);
    const fundraisingProgress = fundraisingGoal > 0 ? Math.min(100, (fundraisingRaised / fundraisingGoal) * 100) : 0;

    const orderCount = orders.length;
    const aov = orderCount > 0 ? grossSales / orderCount : 0;

    // Fulfillment counts by status
    const statusCounts: Record<string, number> = {
      pending: 0,
      paid: 0,
      in_production: 0,
      shipped: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      const key = o.status?.toLowerCase().replace(/\s+/g, "_") || "pending";
      if (key in statusCounts) statusCounts[key]++;
      else statusCounts["pending"]++;
    });

    return {
      grossSales, netPaid, balanceDue,
      fundraisingPct, fundraisingGoal, fundraisingRaised, fundraisingProgress,
      orderCount, aov, productCount,
      statusCounts,
    };
  }, [orders, payments, store, productCount]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fulfillmentItems = [
    { label: "Pending", count: metrics.statusCounts.pending, icon: Clock, color: "text-yellow-600" },
    { label: "Paid", count: metrics.statusCounts.paid, icon: CreditCard, color: "text-blue-600" },
    { label: "In Production", count: metrics.statusCounts.in_production, icon: Factory, color: "text-orange-600" },
    { label: "Shipped", count: metrics.statusCounts.shipped, icon: Truck, color: "text-green-600" },
    { label: "Cancelled", count: metrics.statusCounts.cancelled, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">{store.name}</h2>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            /team-stores/{store.slug}
            {opensIn && <span className="ml-2 text-accent font-medium">· Opens in {opensIn}</span>}
            {closesIn && <span className="ml-2 text-amber-600 font-medium">· Closes in {closesIn}</span>}
          </p>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`${window.location.origin}/team-stores/${store.slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-1.5" /> Preview Store
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/team-stores/${store.id}/orders/new`}>
            <ShoppingBag className="w-4 h-4 mr-1.5" /> Create Manual Order
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/team-stores/${store.id}/products`}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Products
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/team-stores/${store.id}/branding`}>
            <Palette className="w-4 h-4 mr-1.5" /> Edit Branding
          </Link>
        </Button>
        {(status.label === "Draft" || status.label === "Scheduled") && (
          <Button
            size="sm"
            onClick={() => launchMutation.mutate()}
            disabled={launchMutation.isPending}
          >
            <Rocket className="w-4 h-4 mr-1.5" />
            {launchMutation.isPending ? "Launching…" : "Launch Store"}
          </Button>
        )}
        {status.label === "Live" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            {closeMutation.isPending ? "Closing…" : "Close Store"}
          </Button>
        )}
      </div>

      {/* ── Sales + Payments Row ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sales & Payments</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={ShoppingCart} label="Orders" value={metrics.orderCount.toString()} />
          <KpiCard icon={Package} label="Products" value={metrics.productCount.toString()} />
          <KpiCard icon={DollarSign} label="Gross Sales" value={fmt(metrics.grossSales)} />
          <KpiCard icon={CreditCard} label="Paid" value={fmt(metrics.netPaid)} accent="text-green-600" />
          <KpiCard icon={AlertCircle} label="Balance Due" value={fmt(metrics.balanceDue)} accent={metrics.balanceDue > 0 ? "text-amber-600" : undefined} />
          <KpiCard icon={DollarSign} label="Avg Order" value={fmt(metrics.aov)} />
        </div>
      </div>

      {/* ── Fundraising Progress ── */}
      {metrics.fundraisingPct > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fundraising</h3>
          <Card>
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium">{metrics.fundraisingPct}% of eligible sales</span>
                </div>
                <span className="text-sm font-bold">
                  {fmt(metrics.fundraisingRaised)}
                  {metrics.fundraisingGoal > 0 && (
                    <span className="text-muted-foreground font-normal"> / {fmt(metrics.fundraisingGoal)}</span>
                  )}
                </span>
              </div>
              {metrics.fundraisingGoal > 0 && (
                <Progress value={metrics.fundraisingProgress} className="h-2" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Fulfillment Health ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fulfillment</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {fulfillmentItems.map((fi) => (
            <Card key={fi.label}>
              <CardContent className="pt-4 pb-3 text-center">
                <fi.icon className={`w-5 h-5 mx-auto mb-1 ${fi.color}`} />
                <p className="text-xl font-bold">{fi.count}</p>
                <p className="text-[10px] text-muted-foreground">{fi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Schedule ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Opens</p>
              </div>
              <p className="text-sm font-semibold mt-1">
                {store.start_date ? new Date(store.start_date).toLocaleDateString() : "Not set"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Closes</p>
              </div>
              <p className="text-sm font-semibold mt-1">
                {store.end_date ? new Date(store.end_date).toLocaleDateString() : "Not set"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Small KPI Card ─── */

function KpiCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className={`text-xl font-bold ${accent ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
