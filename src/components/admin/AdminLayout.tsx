import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, BookOpen, Settings, ChevronLeft, Package, DollarSign,
  LayoutDashboard, Users, Shirt, Sparkles, BookImage, ShoppingBag,
  Gift, Store, Layers, ShoppingCart, Heart, Image, ExternalLink, BarChart3,
  Bell, ListOrdered, FileText, Truck, AlertCircle, Database,
} from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import toddsLogo from "@/assets/todds-logo.png";
import { AdminGlobalSearch } from "./AdminGlobalSearch";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const globalNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/catalog/master", label: "Master Catalog", icon: Layers },
  { path: "/admin/catalogs", label: "Catalogs", icon: BookOpen },
  { path: "/admin/reps", label: "Sales Reps", icon: Users },
  { path: "/admin/uniforms", label: "Uniform Cards", icon: Shirt },
  { path: "/admin/champro-orders", label: "Champro Orders", icon: Package },
  { path: "/admin/champro-pricing", label: "Champro Pricing", icon: DollarSign },
  { path: "/admin/message-generator", label: "AI Message Generator", icon: Sparkles },
  { path: "/admin/catalog-products", label: "Product Catalog", icon: ShoppingBag },
  { path: "/admin/promo-products", label: "Promo Products", icon: Gift },
  { path: "/admin/team-stores", label: "Team Stores", icon: Store },
  { path: "/admin/orders", label: "All Orders", icon: ShoppingCart },
  { path: "/admin/fulfillment/batches", label: "Fulfillment Batches", icon: Truck },
  { path: "/admin/lookbook-generator", label: "Lookbook Generator", icon: BookImage },
  { path: "/admin/notifications", label: "Notifications", icon: Bell },
  { path: "/admin/staff", label: "Staff Users", icon: Users },
  { path: "/admin/sample-data", label: "Sample Data", icon: Database },
  { path: "/ss-products", label: "S&S Blank Apparel", icon: Layers },
];

const teamStoresNavItems = [
  { path: "/admin/team-stores", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/team-stores/stores", label: "Stores", icon: Store },
  { path: "/admin/team-stores/processing", label: "Processing", icon: AlertCircle },
  { path: "/admin/team-stores/orders", label: "Orders", icon: ShoppingCart },
  { path: "/admin/team-stores/fundraising", label: "Fundraising", icon: Heart },
  { path: "/admin/team-stores/reports", label: "Reports", icon: BarChart3 },
  { path: "/admin/team-stores/logos", label: "Logos", icon: Image },
  { path: "/admin/team-stores/settings", label: "Settings", icon: Settings },
];

// Matches /admin/team-stores/:uuid and extracts the uuid
const STORE_ID_REGEX = /^\/admin\/team-stores\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;

function getStoreNavItems(storeId: string) {
  const base = `/admin/team-stores/${storeId}`;
  return [
    { path: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { path: `${base}/products`, label: "Products", icon: Package },
    { path: `${base}/logos`, label: "Logos", icon: Image },
    { path: `${base}/fundraising`, label: "Fundraising", icon: Heart },
    { path: `${base}/names-numbers`, label: "Names & Numbers", icon: ListOrdered },
    { path: `${base}/orders`, label: "Orders", icon: ShoppingCart },
    { path: `${base}/settings`, label: "Settings", icon: Settings },
  ];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkAdminRole(session.user.id), 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    // Check both user_roles (legacy) and employee_profiles
    const [{ data: roleData }, { data: empData }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("employee_profiles")
        .select("id, role, is_active")
        .eq("id", userId)
        .maybeSingle(),
    ]);
    // Admin if they have the legacy role OR an active employee profile with admin/owner role
    const isEmp = empData && empData.is_active && (empData.role === 'admin' || empData.role === 'owner');
    setIsAdmin(!!roleData || !!isEmp);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Route detection
  const isTeamStores = location.pathname.startsWith("/admin/team-stores");
  const storeIdMatch = location.pathname.match(STORE_ID_REGEX);
  const activeStoreId = storeIdMatch ? storeIdMatch[1] : null;

  // Fetch store name when inside a specific store
  const { data: activeStore } = useQuery({
    queryKey: ["admin-team-store-sidebar", activeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, slug, logo_url, active, status")
        .eq("id", activeStoreId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeStoreId,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have admin privileges. Please contact an administrator to request access.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
            <Button asChild className="btn-cta"><Link to="/">Go Home</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine which sidebar to show
  let navItems: { path: string; label: string; icon: any; exact?: boolean }[];
  let backLink: { to: string; label: string };
  let sidebarHeader: React.ReactNode = null;

  if (activeStoreId) {
    // Inside a specific store
    navItems = getStoreNavItems(activeStoreId);
    backLink = { to: "/admin/team-stores/stores", label: "All Stores" };
    sidebarHeader = activeStore ? (
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          {activeStore.logo_url ? (
            <img src={activeStore.logo_url} alt="" className="w-7 h-7 object-contain rounded bg-muted p-0.5" />
          ) : (
            <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{activeStore.name}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant={activeStore.active ? "default" : "secondary"} className="text-[9px] px-1 py-0">
                {activeStore.status ?? (activeStore.active ? "open" : "inactive")}
              </Badge>
            </div>
          </div>
        </div>
        <a
          href={`/team-stores/${activeStore.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-1"
        >
          <ExternalLink className="w-3 h-3" />
          View storefront
        </a>
      </div>
    ) : (
      <div className="px-3 pb-2">
        <div className="h-7 w-32 bg-muted rounded animate-pulse" />
      </div>
    );
  } else if (isTeamStores) {
    navItems = teamStoresNavItems;
    backLink = { to: "/admin", label: "All Admin" };
    sidebarHeader = (
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">
        Team Stores
      </h3>
    );
  } else {
    navItems = globalNavItems;
    backLink = { to: "/", label: "Back to Site" };
  }

  const isItemActive = (item: { path: string; exact?: boolean }) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path + "/") || location.pathname === item.path;
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Admin Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={toddsLogo} alt="Todd's" className="h-8 w-auto" />
            </Link>
            <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4">
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-4">
            <AdminGlobalSearch />
            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — hidden when inside a specific store (store detail has its own) */}
        {!activeStoreId && (
          <aside className="w-56 bg-background border-r border-border min-h-[calc(100vh-4rem)] hidden md:block shrink-0">
            <nav className="p-4 space-y-1">
              <Link
                to={backLink.to}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {backLink.label}
              </Link>
              <div className="border-t border-border my-3" />

              {sidebarHeader}

              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isItemActive(item)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  );
}
