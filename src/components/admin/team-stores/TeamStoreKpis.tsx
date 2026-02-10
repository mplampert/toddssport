import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ShoppingCart, DollarSign, Heart, CheckCircle } from "lucide-react";

interface KpiData {
  totalSales: number;
  totalOrders: number;
  liveStores: number;
  closedStores: number;
  totalStores: number;
  totalRaised: number;
}

export function TeamStoreKpis() {
  const { data: kpis, isLoading } = useQuery<KpiData>({
    queryKey: ["team-store-kpis"],
    queryFn: async () => {
      const { data: stores } = await supabase
        .from("team_stores")
        .select("id, status, fundraising_percent");
      const totalStores = stores?.length ?? 0;
      const liveStores = stores?.filter((s) => s.status === "open").length ?? 0;
      const closedStores = stores?.filter((s) => s.status === "closed").length ?? 0;

      const { data: orders } = await supabase
        .from("team_store_orders")
        .select("total, store_id")
        .eq("is_sample", false);

      const totalOrders = orders?.length ?? 0;
      const totalSales = (orders ?? []).reduce((sum, o) => sum + Number(o.total ?? 0), 0);

      // Calculate funds raised
      const storeRateMap = new Map<string, number>();
      (stores ?? []).forEach((s: any) => {
        if (s.fundraising_percent && s.fundraising_percent > 0) {
          storeRateMap.set(s.id, s.fundraising_percent);
        }
      });

      const salesByStore = new Map<string, number>();
      (orders ?? []).forEach((o: any) => {
        if (o.store_id) {
          salesByStore.set(o.store_id, (salesByStore.get(o.store_id) ?? 0) + Number(o.total ?? 0));
        }
      });

      let totalRaised = 0;
      storeRateMap.forEach((rate, storeId) => {
        const sales = salesByStore.get(storeId) ?? 0;
        totalRaised += sales * (rate / 100);
      });

      return { totalSales, totalOrders, liveStores, closedStores, totalStores, totalRaised };
    },
  });

  const cards = [
    {
      label: "Total Stores",
      value: kpis?.totalStores?.toString() ?? "—",
      icon: Store,
    },
    {
      label: "Live Stores",
      value: kpis?.liveStores?.toString() ?? "—",
      icon: Store,
    },
    {
      label: "Closed Stores",
      value: kpis?.closedStores?.toString() ?? "—",
      icon: CheckCircle,
    },
    {
      label: "Total Sales",
      value: kpis ? `$${kpis.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—",
      icon: DollarSign,
    },
    {
      label: "Funds Raised",
      value: kpis ? `$${kpis.totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—",
      icon: Heart,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <c.icon className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className={`font-bold truncate ${isLoading ? "text-muted-foreground" : "text-2xl"}`}>
                  {isLoading ? "…" : c.value}
                </p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
