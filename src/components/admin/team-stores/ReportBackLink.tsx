import { useNavigate } from "react-router-dom";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { ChevronLeft } from "lucide-react";

export function ReportBackLink() {
  const { store } = useTeamStoreContext();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/admin/team-stores/${store.id}/reports`)}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" /> All Reports
    </button>
  );
}
