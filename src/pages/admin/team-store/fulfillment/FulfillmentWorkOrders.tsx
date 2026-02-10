import { useMemo } from "react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV, itemDisplayName, itemSize, itemDecorationType } from "@/hooks/useStoreReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ReportBackLink } from "@/components/admin/team-stores/ReportBackLink";

export default function FulfillmentWorkOrders() {
  const { store } = useTeamStoreContext();
  const { items, isLoading } = useStoreReportData(store.id);

  // Group by product + decoration type
  const groups = useMemo(() => {
    const map = new Map<string, { product: string; decoration: string; rows: { size: string; qty: number; notes: string }[] }>();

    items.forEach((item) => {
      const product = itemDisplayName(item);
      const decoration = itemDecorationType(item);
      const key = `${product}|||${decoration}`;
      const g = map.get(key) ?? { product, decoration, rows: [] };

      const size = itemSize(item);
      // Merge same sizes
      const existing = g.rows.find((r) => r.size === size);
      if (existing) {
        existing.qty += Number(item.quantity);
      } else {
        // Build notes from decoration snapshot
        let notes = "";
        if (item.decoration_snapshot) {
          const d = typeof item.decoration_snapshot === "string" ? JSON.parse(item.decoration_snapshot) : item.decoration_snapshot;
          if (Array.isArray(d)) {
            notes = d.map((dec: any) => `${dec.placement ?? dec.location ?? ""} ${dec.method ?? ""}`).join("; ").trim();
          }
        }
        g.rows.push({ size, qty: Number(item.quantity), notes });
      }
      map.set(key, g);
    });

    return Array.from(map.values()).sort((a, b) => a.product.localeCompare(b.product));
  }, [items]);

  const exportCSVHandler = () => {
    const headers = ["Product", "Decoration", "Size", "Quantity", "Notes"];
    const rows: (string | number)[][] = [];
    groups.forEach((g) => {
      g.rows.forEach((r) => {
        rows.push([g.product, g.decoration, r.size, r.qty, r.notes]);
      });
    });
    downloadCSV(`${store.name}-work-orders.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <ReportBackLink />
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Work Orders</h3>
        <Button variant="outline" size="sm" onClick={exportCSVHandler} disabled={groups.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : groups.length === 0 ? <p className="text-sm text-muted-foreground">No items.</p> : (
        groups.map((g, gi) => (
          <Card key={gi}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {g.product} <span className="text-muted-foreground font-normal">— {g.decoration}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.rows.sort((a, b) => a.size.localeCompare(b.size)).map((r, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="text-sm">{r.size}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{r.qty}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.notes || "—"}</TableCell>
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
