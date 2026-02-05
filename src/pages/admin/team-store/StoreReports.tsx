import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, DollarSign } from "lucide-react";

export default function StoreReports() {
  const { store } = useTeamStoreContext();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">Units Sold</h3>
            <p className="text-3xl font-bold mt-2">—</p>
            <p className="text-xs text-muted-foreground mt-1">Data coming soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">Revenue</h3>
            <p className="text-3xl font-bold mt-2">—</p>
            <p className="text-xs text-muted-foreground mt-1">Data coming soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">By Product</h3>
            <p className="text-3xl font-bold mt-2">—</p>
            <p className="text-xs text-muted-foreground mt-1">Data coming soon</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed reports for <strong>{store.name}</strong> will appear here once orders start flowing through this store.
            Reports will include units sold by product, revenue breakdowns, and trend charts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
