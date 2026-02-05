import { useParams, useNavigate, Link, useLocation, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ExternalLink,
  LayoutDashboard,
  Package,
  Image,
  Palette,
  ShoppingCart,
  BarChart3,
  Truck,
  Megaphone,
  Settings,
  Store,
} from "lucide-react";

const storeNavItems = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "products", label: "Products", icon: Package },
  { path: "logos", label: "Logos", icon: Image },
  { path: "branding", label: "Branding", icon: Palette },
  { path: "orders", label: "Orders", icon: ShoppingCart },
  { path: "reports", label: "Reports", icon: BarChart3 },
  { path: "fulfillment", label: "Fulfillment", icon: Truck },
  { path: "marketing", label: "Marketing", icon: Megaphone },
  { path: "settings", label: "Settings", icon: Settings },
];

export default function AdminTeamStoreDetail() {
  const { id, "*": subPath } = useParams<{ id: string; "*": string }>();
  const navigate = useNavigate();
  const location = useLocation();

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

  const basePath = `/admin/team-stores/${id}`;
  const currentSub = subPath ?? "";

  return (
    <AdminLayout>
      <div className="flex gap-0 -m-6">
        {/* Store sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-background min-h-[calc(100vh-4rem)] p-3 space-y-1">
          {/* Store header */}
          <div className="px-2 pb-3 mb-2 border-b border-border">
            <Link
              to="/admin/team-stores"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
            >
              <ChevronLeft className="w-3 h-3" /> All Stores
            </Link>
            <div className="flex items-center gap-2">
              {store.logo_url ? (
                <img src={store.logo_url} alt="" className="w-8 h-8 object-contain rounded bg-muted p-0.5" />
              ) : (
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <Store className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{store.name}</p>
                <Badge variant={store.active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {store.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Nav items */}
          {storeNavItems.map((item) => {
            const isActive = currentSub === item.path;
            return (
              <Link
                key={item.path}
                to={item.path ? `${basePath}/${item.path}` : basePath}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* View store link */}
          <div className="pt-3 mt-3 border-t border-border">
            <a
              href={`/team-stores/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Store
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 min-w-0">
          <Outlet context={{ store }} />
        </main>
      </div>
    </AdminLayout>
  );
}
