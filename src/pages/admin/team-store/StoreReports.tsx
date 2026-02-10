import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { cn } from "@/lib/utils";

const REPORT_TABS = [
  { label: "Summary", path: "summary" },
  { label: "Fundraising", path: "fundraising" },
  { label: "Orders", path: "orders" },
  { label: "Sales Tax", path: "tax" },
  { label: "Data Export", path: "export" },
] as const;

const FULFILLMENT_TABS = [
  { label: "Work Orders", path: "work-orders" },
  { label: "Packing Lists", path: "packing" },
  { label: "Supplier POs", path: "pos" },
] as const;

export default function StoreReports() {
  const { store } = useTeamStoreContext();
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = `/admin/team-stores/${store.id}/reports`;
  const currentSeg = location.pathname.replace(basePath, "").replace(/^\//, "").split("/")[0] || "summary";

  const isClosed = store.status === "closed";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">Performance, fundraising, orders, tax, and exports for {store.name}.</p>
      </div>

      <nav className="flex border-b border-border gap-1 overflow-x-auto">
        {REPORT_TABS.map((t) => (
          <button
            key={t.path}
            onClick={() => navigate(`${basePath}/${t.path}`)}
            className={cn(
              "px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              currentSeg === t.path
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            {t.label}
          </button>
        ))}
        {/* Separator */}
        {isClosed && (
          <>
            <div className="border-l border-border mx-2" />
            {FULFILLMENT_TABS.map((t) => (
              <button
                key={t.path}
                onClick={() => navigate(`${basePath}/${t.path}`)}
                className={cn(
                  "px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  currentSeg === t.path
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {t.label}
              </button>
            ))}
          </>
        )}
      </nav>

      <Outlet context={{ store }} />
    </div>
  );
}
