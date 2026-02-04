import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Box, Search, AlertTriangle } from "lucide-react";
import { CustomOrdersTab } from "@/components/admin/champro/CustomOrdersTab";
import { StockOrdersTab } from "@/components/admin/champro/StockOrdersTab";
import { OrderStatusTab } from "@/components/admin/champro/OrderStatusTab";
import { ManualPOTab } from "@/components/admin/champro/ManualPOTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function AdminChamproOrders() {
  // Fetch count of manual orders for badge
  const { data: manualCount } = useQuery({
    queryKey: ["manual-champro-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("champro_orders")
        .select("*", { count: "exact", head: true })
        .eq("needs_manual_champro", true);

      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Champro Orders</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage Custom and Stock product orders through the Champro API
          </p>
        </div>

        <Tabs defaultValue={manualCount && manualCount > 0 ? "manual" : "custom"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[650px]">
            <TabsTrigger value="manual" className="flex items-center gap-2 relative">
              <AlertTriangle className="w-4 h-4" />
              Manual PO
              {manualCount && manualCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                  {manualCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Custom Orders
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2">
              <Box className="w-4 h-4" />
              Stock Orders
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Order Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <ManualPOTab />
          </TabsContent>

          <TabsContent value="custom">
            <CustomOrdersTab />
          </TabsContent>

          <TabsContent value="stock">
            <StockOrdersTab />
          </TabsContent>

          <TabsContent value="status">
            <OrderStatusTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
