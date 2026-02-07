import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Heart,
  Image,
  Settings,
} from "lucide-react";

const sidebarItems = [
  { path: "/admin/team-stores", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/admin/team-stores/stores", label: "Stores", icon: Store },
  { path: "/admin/team-stores/orders", label: "Orders", icon: ShoppingCart },
  { path: "/admin/team-stores/fundraising", label: "Fundraising", icon: Heart },
  { path: "/admin/team-stores/logos", label: "Logos", icon: Image },
  { path: "/admin/team-stores/settings", label: "Settings", icon: Settings },
];

export function TeamStoresLayout() {
  const location = useLocation();

  const isActive = (item: (typeof sidebarItems)[0]) => {
    if (item.end) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem-3rem)]">
      {/* Inner Team Stores sidebar */}
      <aside className="w-52 border-r border-border bg-background/50 hidden md:block shrink-0">
        <div className="p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Team Stores
          </h3>
          <nav className="space-y-0.5">
            {sidebarItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Page content */}
      <div className="flex-1 p-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
