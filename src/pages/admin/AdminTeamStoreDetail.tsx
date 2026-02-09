import { useParams, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  FileText,
  MessageSquare,
  UserCheck,
  DollarSign,
  Tag,
} from "lucide-react";

const STORE_TABS = [
  { label: "Overview", path: "overview", icon: LayoutDashboard },
  { label: "Details", path: "details", icon: FileText },
  { label: "Products", path: "products", icon: Package },
  { label: "Logos", path: "logos", icon: Image },
  { label: "Branding", path: "branding", icon: Palette },
  { label: "Messages", path: "messages", icon: MessageSquare },
  { label: "Orders", path: "orders", icon: ShoppingCart },
  { label: "Promo Codes", path: "promo-codes", icon: Tag },
  { label: "Reports", path: "reports", icon: BarChart3 },
  { label: "Fulfillment", path: "fulfillment", icon: Truck },
  { label: "Marketing", path: "marketing", icon: Megaphone },
  { label: "Personalization", path: "personalization", icon: UserCheck },
  { label: "Decoration $", path: "decoration-pricing", icon: DollarSign },
  { label: "Settings", path: "settings", icon: Settings },
] as const;

export default function AdminTeamStoreDetail() {
  const { id } = useParams<{ id: string }>();
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Store not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/team-stores/stores")}>
          Back to Stores
        </Button>
      </div>
    );
  }

  const basePath = `/admin/team-stores/${id}`;
  const currentPath = location.pathname;

  // Determine active tab from the URL
  const activeTab = STORE_TABS.find((t) => currentPath.endsWith(`/${t.path}`))?.path
    ?? (currentPath === basePath || currentPath === `${basePath}/` || currentPath.endsWith("/dashboard") ? "overview" : "overview");

  const isOpen = store.status === "open";
  const storeUrl = isOpen
    ? `${window.location.origin}/team-stores/${store.slug}`
    : `${window.location.origin}/preview/team-store/${store.slug}?token=${store.preview_token ?? ""}`;
  const viewLabel = isOpen ? "View Store" : "Preview Store";

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 space-y-4">
        {/* Back link */}
        <button
          onClick={() => navigate("/admin/team-stores/stores")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> All Stores
        </button>

        {/* Store header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {store.logo_url && (
              <img src={store.logo_url} alt="" className="w-8 h-8 rounded object-contain" />
            )}
            <h2 className="text-sm font-semibold text-foreground truncate">{store.name}</h2>
          </div>
          <Badge variant={store.active ? "default" : "secondary"} className="text-xs">
            {store.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Nav tabs */}
        <nav className="flex flex-col gap-0.5">
          {STORE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(`${basePath}/${tab.path}`)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* View store button */}
        <div className="pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              {viewLabel}
            </a>
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <Outlet context={{ store }} />
      </main>
    </div>
  );
}
