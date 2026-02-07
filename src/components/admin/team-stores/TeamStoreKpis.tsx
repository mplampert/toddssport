import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

interface KpiData {
  totalSales: number;
  totalOrders: number;
  activeStores: number;
  totalStores: number;
}

export function TeamStoreKpis() {
  const { data: kpis, isLoading } = useQuery<KpiData>({
    queryKey: ["team-store-kpis"],
    queryFn: async () => {
      // Active / total stores
      const { data: stores } = await supabase
        .from("team_stores")
        .select("status");
      const totalStores = stores?.length ?? 0;
      const activeStores = stores?.filter((s) => s.status === "open").length ?? 0;

      // Sales from cart_items linked to team stores
      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("unit_price, quantity")
        .not("team_store_id", "is", null);
      const totalSales = (cartItems ?? []).reduce(
        (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 0),
        0
      );

      // Orders that reference a team store (via request_payload)
      const { data: orders } = await supabase
        .from("champro_orders")
        .select("id, request_payload");
      const teamOrders = (orders ?? []).filter(
        (o: any) => o.request_payload?.team_store_id
      );

      return {
        totalSales,
        totalOrders: teamOrders.length,
        activeStores,
        totalStores,
      };
    },
  });

  const cards = [
    {
      label: "Total Sales",
      value: kpis ? `$${kpis.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—",
      icon: DollarSign,
    },
    {
      label: "Total Orders",
      value: kpis?.totalOrders?.toString() ?? "—",
      icon: ShoppingCart,
    },
    {
      label: "Active Stores",
      value: kpis?.activeStores?.toString() ?? "—",
      icon: Store,
    },
    {
      label: "Total Stores",
      value: kpis?.totalStores?.toString() ?? "—",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
