import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { StoreMessagesManager } from "@/components/admin/team-stores/StoreMessagesManager";

export default function StoreMessagesPage() {
  const { store } = useTeamStoreContext();
  return <StoreMessagesManager storeId={store.id} />;
}
