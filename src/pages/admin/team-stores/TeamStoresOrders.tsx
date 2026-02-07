import { AllOrdersTable } from "@/components/admin/team-stores/AllOrdersTable";

export default function TeamStoresOrders() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">All Team Store Orders</h1>
      <AllOrdersTable />
    </div>
  );
}
