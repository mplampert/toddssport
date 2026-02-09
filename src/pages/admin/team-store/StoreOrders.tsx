import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { OrdersListTable } from "@/components/admin/team-stores/orders/OrdersListTable";

export default function StoreOrders() {
  const { store } = useTeamStoreContext();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Orders</h2>
      <OrdersListTable storeId={store.id} />
    </div>
  );
}
