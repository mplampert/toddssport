import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ExternalLink,
  Rocket,
  XCircle,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Plus,
  Settings,
  Users,
  CopyPlus,
  FileText,
  Heart,
  Receipt,
  Landmark,
  Download,
  Printer,
  PackageCheck,
  Truck,
  Eye,
  FileDown,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { StoreDashboardReportCard } from "@/components/admin/team-stores/StoreDashboardReportCard";

function getStoreStatus(store: { active: boolean; start_date: string | null; end_date: string | null }) {
  const now = new Date();
  const start = store.start_date ? new Date(store.start_date) : null;
  const end = store.end_date ? new Date(store.end_date) : null;

  if (!store.active) return { label: "Inactive", variant: "secondary" as const };
  if (end && now > end) return { label: "Closed", variant: "destructive" as const };
  if (start && now < start) return { label: "Scheduled", variant: "outline" as const };
  return { label: "Live", variant: "default" as const };
}

export default function StoreDashboard() {
  const { store } = useTeamStoreContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const status = getStoreStatus(store);
  const storeUrl = `${window.location.origin}/team-stores/${store.slug}`;

  // --- KPIs from real orders table ---
  const { data: ordersData = [] } = useQuery({
    queryKey: ["store-dash-orders", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_orders")
        .select("id, total")
        .eq("store_id", store.id)
        .eq("is_sample", false);
      if (error) throw error;
      return data ?? [];
    },
  });

  const orderCount = ordersData.length;
  const totalSales = ordersData.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
  const fundraisingRate = store.fundraising_percent ?? 0;

  const isLive = status.label === "Live";
  const isClosed = status.label === "Closed";

  // --- Launch / Close ---
  const toggleActive = useMutation({
    mutationFn: async () => {
      const newActive = !store.active;
      const newStatus = newActive ? "open" : "closed";
      const { error } = await supabase
        .from("team_stores")
        .update({ active: newActive, status: newStatus })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      queryClient.invalidateQueries({ queryKey: ["team-store-all-stores-table"] });
      queryClient.invalidateQueries({ queryKey: ["team-store-kpis"] });
      toast.success(store.active ? "Store closed" : "Store launched!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Duplicate ---
  const duplicateStore = useMutation({
    mutationFn: async () => {
      // Clone store
      const { data: newStore, error } = await supabase
        .from("team_stores")
        .insert({
          name: `${store.name} (Copy)`,
          slug: `${store.slug}-copy-${Date.now().toString(36)}`,
          primary_color: store.primary_color,
          secondary_color: store.secondary_color,
          logo_url: store.logo_url,
          active: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Clone products
      const { data: products } = await supabase
        .from("team_store_products")
        .select("style_id, notes, price_override, sort_order, active")
        .eq("team_store_id", store.id);
      if (products && products.length > 0) {
        await supabase.from("team_store_products").insert(
          products.map((p) => ({ ...p, team_store_id: newStore.id }))
        );
      }
      return newStore.id;
    },
    onSuccess: (newId) => {
      toast.success("Store duplicated");
      navigate(`/admin/team-stores/${newId}/dashboard`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Store link copied!");
  };

  const fulfillmentDisabled = !isClosed && !(!store.start_date && !store.end_date);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="space-y-3">
        <Link
          to="/admin/team-stores"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">spirit_wear store</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Preview Store
              </a>
            </Button>
            <Button
              variant={isLive ? "destructive" : "default"}
              size="sm"
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
            >
              {isLive ? (
                <>
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Close Store
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-1.5" />
                  Launch Store
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Dates + KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Open Date</p>
            <p className="text-sm font-semibold mt-1">{store.start_date ?? "Not set"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Close Date</p>
            <p className="text-sm font-semibold mt-1">{store.end_date ?? "Not set"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <p className="text-xl font-bold mt-1">{orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Sales</p>
            </div>
            <p className="text-xl font-bold mt-1">${totalSales.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Order Value</p>
            </div>
            <p className="text-xl font-bold mt-1">${avgOrderValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Fundraising Rate</p>
            </div>
            <p className="text-xl font-bold mt-1">{fundraisingRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="w-4 h-4 mr-1.5" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/team-stores/${store.id}/products`}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Products
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/team-stores/${store.id}/settings`}>
              <Settings className="w-4 h-4 mr-1.5" />
              Edit Store
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Users className="w-4 h-4 mr-1.5" />
            Manage Roster
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateStore.mutate()}
            disabled={duplicateStore.isPending}
          >
            <CopyPlus className="w-4 h-4 mr-1.5" />
            {duplicateStore.isPending ? "Duplicating…" : "Duplicate Store"}
          </Button>
        </div>
      </div>

      {/* ── Reports ── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StoreDashboardReportCard
            icon={FileText}
            title="Store Summary"
            description="Total orders, items sold, sales, fundraising, and average order value with product/size breakdown."
            actions={[
              { label: "View", icon: Eye },
              { label: "CSV", icon: FileDown },
              { label: "PDF", icon: FileDown },
            ]}
          />
          <StoreDashboardReportCard
            icon={Heart}
            title="Fundraising Report"
            description="Total fundraising by product, per order, and per player/team if roster-linked."
            actions={[
              { label: "View", icon: Eye },
              { label: "CSV", icon: FileDown },
              { label: "Email", icon: Mail },
            ]}
          />
          <StoreDashboardReportCard
            icon={Receipt}
            title="Order Summary"
            description="Order-level report with filters for paid/unpaid, pickup location, and shipping method."
            actions={[
              { label: "View", icon: Eye },
              { label: "CSV", icon: FileDown },
            ]}
          />
          <StoreDashboardReportCard
            icon={Landmark}
            title="Sales Tax Report"
            description="Summarized tax by jurisdiction for the store's date range."
            actions={[
              { label: "View", icon: Eye },
              { label: "CSV", icon: FileDown },
            ]}
          />
          <StoreDashboardReportCard
            icon={Download}
            title="Data Export"
            description="Export all raw order line items for custom spreadsheets or external systems."
            actions={[{ label: "Download Full CSV", icon: FileDown }]}
          />
        </div>
      </div>

      {/* ── Fulfillment ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold text-foreground">Fulfillment</h2>
          {fulfillmentDisabled && (
            <Badge variant="outline" className="text-xs">Available after store closes</Badge>
          )}
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${fulfillmentDisabled ? "opacity-60 pointer-events-none" : ""}`}>
          <StoreDashboardReportCard
            icon={Printer}
            title="Work Orders"
            description="Grouped by product and decoration type. Shows what to print, embroider, or DTF."
            actions={[
              { label: "View", icon: Eye },
              { label: "PDF", icon: FileDown },
              { label: "CSV", icon: FileDown },
            ]}
          />
          <StoreDashboardReportCard
            icon={PackageCheck}
            title="Sorting / Packing Lists"
            description="Player/recipient-based lists showing who gets what sizes and items."
            actions={[
              { label: "Generate", icon: FileText },
              { label: "PDF", icon: FileDown },
              { label: "CSV", icon: FileDown },
            ]}
          />
          <StoreDashboardReportCard
            icon={Truck}
            title="Supplier POs"
            description="Generate purchase orders for S&S and other suppliers, grouped by supplier SKU."
            actions={[
              { label: "Generate", icon: FileText },
              { label: "View", icon: Eye },
              { label: "PDF", icon: FileDown },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
