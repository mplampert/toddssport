import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { TeamStoreProducts } from "@/components/admin/team-stores/TeamStoreProducts";

export default function StoreProducts() {
  const { store } = useTeamStoreContext();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Products</h2>
      <TeamStoreProducts storeId={store.id} />
    </div>
  );
}
