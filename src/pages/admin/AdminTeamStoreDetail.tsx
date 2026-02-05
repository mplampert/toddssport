import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { TeamStoreBasicsForm } from "@/components/admin/team-stores/TeamStoreBasicsForm";
import { TeamStoreBrandingPreview } from "@/components/admin/team-stores/TeamStoreBrandingPreview";
import { TeamStoreProducts } from "@/components/admin/team-stores/TeamStoreProducts";
import { TeamStoreOrders } from "@/components/admin/team-stores/TeamStoreOrders";

export default function AdminTeamStoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: store, isLoading } = useQuery({
    queryKey: ["admin-team-store", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Store not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/team-stores")}>
            Back to Team Stores
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/team-stores")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{store.name}</h1>
            <p className="text-muted-foreground text-sm">
              /team-stores/{store.slug}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TeamStoreBasicsForm store={store} />
          </div>
          <div>
            <TeamStoreBrandingPreview
              name={store.name}
              logo_url={store.logo_url}
              primary_color={store.primary_color}
              secondary_color={store.secondary_color}
              start_date={store.start_date}
              end_date={store.end_date}
            />
          </div>
        </div>

        <TeamStoreProducts storeId={store.id} />

        <TeamStoreOrders storeId={store.id} />
      </div>
    </AdminLayout>
  );
}
