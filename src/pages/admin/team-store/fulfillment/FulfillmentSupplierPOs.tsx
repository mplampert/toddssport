import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV, itemDisplayName, itemSize, itemColor } from "@/hooks/useStoreReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function FulfillmentSupplierPOs() {
  const { store } = useTeamStoreContext();
  const { items, isLoading } = useStoreReportData(store.id);

  // Resolve product style_ids to brand names for supplier grouping
  const productIds = [...new Set(items.filter((i) => i.team_store_product_id).map((i) => i.team_store_product_id!))];
  const { data: products = [] } = useQuery({
    queryKey: ["report-store-products", store.id, productIds.length],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data } = await supabase
        .from("team_store_products")
        .select("id, style_id")
        .in("id", productIds);
      return data ?? [];
    },
    enabled: productIds.length > 0,
  });

  const styleIds = [...new Set(products.map((p: any) => p.style_id).filter(Boolean))];
  const { data: styles = [] } = useQuery({
    queryKey: ["report-catalog-styles", styleIds],
    queryFn: async () => {
      if (styleIds.length === 0) return [];
      const { data } = await supabase
        .from("catalog_styles")
        .select("style_id, brand_name")
        .in("style_id", styleIds);
      return data ?? [];
    },
    enabled: styleIds.length > 0,
  });

  // Build maps
  const productStyleMap = new Map((products as any[]).map((p) => [p.id, p.style_id]));
  const styleBrandMap = new Map((styles as any[]).map((s) => [s.style_id, s.brand_name]));

  const supplierGroups = useMemo(() => {
    const map = new Map<string, { supplier: string; rows: { sku: string; product: string; color: string; size: string; qty: number }[] }>();

    items.forEach((item) => {
      const styleId = item.team_store_product_id ? productStyleMap.get(item.team_store_product_id) : null;
      const supplier = styleId ? (styleBrandMap.get(styleId) ?? "Unknown Supplier") : "Unknown Supplier";
      const g = map.get(supplier) ?? { supplier, rows: [] };

      const sku = item.catalog_sku ?? "—";
      const product = itemDisplayName(item);
      const color = itemColor(item);
      const size = itemSize(item);
      const key = `${sku}|||${color}|||${size}`;

      const existing = g.rows.find((r) => `${r.sku}|||${r.color}|||${r.size}` === key);
      if (existing) {
        existing.qty += Number(item.quantity);
      } else {
        g.rows.push({ sku, product, color, size, qty: Number(item.quantity) });
      }
      map.set(supplier, g);
    });

    return Array.from(map.values()).sort((a, b) => a.supplier.localeCompare(b.supplier));
  }, [items, productStyleMap, styleBrandMap]);

  const exportSupplierCSV = (supplier: string, rows: any[]) => {
    downloadCSV(
      `${store.name}-PO-${supplier}.csv`,
      ["Supplier SKU", "Product", "Color", "Size", "Qty"],
      rows.map((r) => [r.sku, r.product, r.color, r.size, r.qty])
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Supplier Purchase Orders</h3>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : supplierGroups.length === 0 ? <p className="text-sm text-muted-foreground">No items.</p> : (
        supplierGroups.map((g, gi) => (
          <Card key={gi}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">{g.supplier}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportSupplierCSV(g.supplier, g.rows)}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.rows.sort((a, b) => a.sku.localeCompare(b.sku)).map((r, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="text-xs font-mono">{r.sku}</TableCell>
                      <TableCell className="text-sm">{r.product}</TableCell>
                      <TableCell className="text-sm">{r.color}</TableCell>
                      <TableCell className="text-sm">{r.size}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{r.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
