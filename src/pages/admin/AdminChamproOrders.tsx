import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Box, Search } from "lucide-react";
import { CustomOrdersTab } from "@/components/admin/champro/CustomOrdersTab";
import { StockOrdersTab } from "@/components/admin/champro/StockOrdersTab";
import { OrderStatusTab } from "@/components/admin/champro/OrderStatusTab";

export default function AdminChamproOrders() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Champro Orders</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage Custom and Stock product orders through the Champro API
          </p>
        </div>

        <Tabs defaultValue="custom" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
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
