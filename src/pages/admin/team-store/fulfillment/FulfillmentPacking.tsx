import { useState, useMemo } from "react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV, itemDisplayName, itemSize } from "@/hooks/useStoreReportData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ReportBackLink } from "@/components/admin/team-stores/ReportBackLink";

type ViewMode = "recipient" | "product";

export default function FulfillmentPacking() {
  const { store } = useTeamStoreContext();
  const { orders, items, isLoading } = useStoreReportData(store.id);
  const [view, setView] = useState<ViewMode>("recipient");

  const orderMap = new Map(orders.map((o) => [o.id, o]));

  // By Recipient
  const byRecipient = useMemo(() => {
    const map = new Map<string, { name: string; orderId: string; pickup: string; items: { product: string; size: string; qty: number }[] }>();
    items.forEach((item) => {
      const o = orderMap.get(item.order_id);
      if (!o) return;
      const name = o.customer_name ?? o.customer_email ?? "Unknown";
      const key = o.id;
      const entry = map.get(key) ?? { name, orderId: o.order_number, pickup: o.pickup_location_id ?? "—", items: [] };
      entry.items.push({ product: itemDisplayName(item), size: itemSize(item), qty: Number(item.quantity) });
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, orderMap]);

  // By Product then recipient
  const byProduct = useMemo(() => {
    const map = new Map<string, { product: string; recipients: { name: string; orderId: string; size: string; qty: number }[] }>();
    items.forEach((item) => {
      const o = orderMap.get(item.order_id);
      if (!o) return;
      const product = itemDisplayName(item);
      const entry = map.get(product) ?? { product, recipients: [] };
      entry.recipients.push({
        name: o.customer_name ?? o.customer_email ?? "Unknown",
        orderId: o.order_number,
        size: itemSize(item),
        qty: Number(item.quantity),
      });
      map.set(product, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.product.localeCompare(b.product));
  }, [items, orderMap]);

  const exportRecipientCSV = () => {
    const headers = ["Recipient", "Order ID", "Pickup Location", "Product", "Size", "Qty"];
    const rows: (string | number)[][] = [];
    byRecipient.forEach((r) => {
      r.items.forEach((it) => {
        rows.push([r.name, r.orderId, r.pickup, it.product, it.size, it.qty]);
      });
    });
    downloadCSV(`${store.name}-packing-list.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <ReportBackLink />
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Sorting / Packing Lists</h3>
        <div className="flex gap-2">
          <Button variant={view === "recipient" ? "default" : "outline"} size="sm" onClick={() => setView("recipient")}>By Recipient</Button>
          <Button variant={view === "product" ? "default" : "outline"} size="sm" onClick={() => setView("product")}>By Product</Button>
          <Button variant="outline" size="sm" onClick={exportRecipientCSV} disabled={byRecipient.length === 0}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : view === "recipient" ? (
        byRecipient.length === 0 ? <p className="text-sm text-muted-foreground">No orders.</p> : (
          byRecipient.map((r, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {r.name}
                  <span className="text-xs font-normal text-muted-foreground">#{r.orderId}</span>
                  {r.pickup !== "—" && <span className="text-xs font-normal text-muted-foreground">• Pickup: {r.pickup}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.items.map((it, j) => (
                      <TableRow key={j}>
                        <TableCell className="text-sm">{it.product}</TableCell>
                        <TableCell className="text-sm">{it.size}</TableCell>
                        <TableCell className="text-right text-sm">{it.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )
      ) : (
        byProduct.length === 0 ? <p className="text-sm text-muted-foreground">No orders.</p> : (
          byProduct.map((p, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{p.product}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.recipients.map((r, j) => (
                      <TableRow key={j}>
                        <TableCell className="text-sm">{r.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">#{r.orderId}</TableCell>
                        <TableCell className="text-sm">{r.size}</TableCell>
                        <TableCell className="text-right text-sm">{r.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )
      )}
    </div>
  );
}
