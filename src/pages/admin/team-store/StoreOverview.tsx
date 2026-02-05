import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { TeamStoreBrandingPreview } from "@/components/admin/team-stores/TeamStoreBrandingPreview";

export default function StoreOverview() {
  const { store } = useTeamStoreContext();

  const { data: productCount = 0 } = useQuery({
    queryKey: ["team-store-product-count", store.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("team_store_products")
        .select("id", { count: "exact", head: true })
        .eq("team_store_id", store.id);
      if (error) return 0;
      return count ?? 0;
    },
  });

  const { data: orderCount = 0 } = useQuery({
    queryKey: ["team-store-order-count", store.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("champro_orders")
        .select("id", { count: "exact", head: true })
        .contains("request_payload", { team_store_id: store.id });
      if (error) return 0;
      return count ?? 0;
    },
  });

  const dateRange = store.start_date || store.end_date
    ? `${store.start_date ?? "—"} → ${store.end_date ?? "—"}`
    : "No dates set";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{store.name}</h2>
        <p className="text-muted-foreground text-sm mt-1">/team-stores/{store.slug}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{productCount}</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orderCount}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium truncate">{dateRange}</p>
                <p className="text-xs text-muted-foreground">Store Dates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <Badge variant={store.active ? "default" : "secondary"}>
                  {store.active ? "Active" : "Inactive"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branding preview */}
      <TeamStoreBrandingPreview
        name={store.name}
        logo_url={store.logo_url}
        primary_color={store.primary_color}
        secondary_color={store.secondary_color}
        start_date={store.start_date}
        end_date={store.end_date}
      />
    </div>
  );
}
