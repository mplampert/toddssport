import { Outlet, useLocation } from "react-router-dom";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import StoreReportsLanding from "./StoreReportsLanding";

export default function StoreReports() {
  const ctx = useTeamStoreContext();
  const location = useLocation();
  const base = `/admin/team-stores/${ctx.store.id}/reports`;
  const isLanding = location.pathname === base || location.pathname === `${base}/`;

  if (isLanding) {
    return <StoreReportsLanding />;
  }

  return <Outlet context={ctx} />;
}
