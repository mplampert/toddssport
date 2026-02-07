import { useParams, useNavigate, Link, Outlet } from "react-router-dom";
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
  Heart,
  ShoppingCart,
  Store,
} from "lucide-react";

const storeNavItems = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "products", label: "Products", icon: Package },
  { path: "logos", label: "Logos", icon: Image },
  { path: "fundraising", label: "Fundraising", icon: Heart },
  { path: "orders", label: "Orders", icon: ShoppingCart },
];

export default function AdminTeamStoreDetail() {
  const { id, "*": subPath } = useParams<{ id: string; "*": string }>();
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

  const basePath = `/admin/team-stores/${id}`;
  const currentSub = subPath ?? "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Store header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/team-stores"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="w-8 h-8 object-contain rounded bg-muted p-0.5" />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                <Store className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={store.active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {store.active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">/{store.slug}</span>
              </div>
            </div>
          </div>
          <a
            href={`/team-stores/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-4 h-4" />
            View Store
          </a>
        </div>

        {/* Inner tab navigation */}
        <nav className="flex border-b border-border gap-1 overflow-x-auto">
          {storeNavItems.map((item) => {
            const isActive = item.path === ""
              ? currentSub === "" || currentSub === "dashboard"
              : currentSub === item.path;
            const href = item.path === "" ? basePath : `${basePath}/${item.path}`;
            return (
              <Link
                key={item.path}
                to={href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Tab content */}
        <Outlet context={{ store }} />
      </div>
    </AdminLayout>
  );
}
