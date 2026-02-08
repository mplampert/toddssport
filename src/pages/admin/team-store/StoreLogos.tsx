import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { LogoLibrary } from "@/components/admin/team-stores/LogoLibrary";

export default function StoreLogos() {
  const { store } = useTeamStoreContext();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Logos</h2>
      <LogoLibrary storeId={store.id} logoUrl={store.logo_url} />
    </div>
  );
}
