import { Link, Outlet, useLocation } from "react-router-dom";
import { Heart, Users, Store, Package, Truck, Building2 } from "lucide-react";

const reportNavItems = [
  { path: "fundraising", label: "Fundraising", icon: Heart },
  { path: "personalization", label: "Personalization", icon: Users },
  { path: "stores", label: "Stores", icon: Store },
  { path: "products", label: "Products", icon: Package },
  { path: "fulfillment", label: "Fulfillment", icon: Truck },
  { path: "organizations", label: "Organizations", icon: Building2 },
];

export default function AdminReports() {
  const location = useLocation();

  const basePath = "/admin/team-stores/reports";

  const isActive = (sub: string) => {
    const full = `${basePath}/${sub}`;
    return location.pathname === full || location.pathname.startsWith(full + "/");
  };

  const isIndex = location.pathname === basePath || location.pathname === basePath + "/";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Production, sales, and fundraising data across all team stores.
        </p>
      </div>

      {/* Report Tab Nav */}
      <nav className="flex border-b border-border gap-1 overflow-x-auto">
        {reportNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              isActive(item.path) || (isIndex && item.path === "fundraising")
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
