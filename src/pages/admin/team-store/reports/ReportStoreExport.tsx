import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV, itemDisplayName, itemSize, itemColor } from "@/hooks/useStoreReportData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { ReportBackLink } from "@/components/admin/team-stores/ReportBackLink";

export default function ReportStoreExport() {
  const { store } = useTeamStoreContext();
  const { orders, items, isLoading } = useStoreReportData(store.id);
  const pct = store.fundraising_percent ?? 0;

  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const exportFull = () => {
    const headers = [
      "Order ID", "Order Date", "Customer Name", "Customer Email",
      "Order Subtotal", "Order Tax", "Order Shipping", "Order Discount", "Order Total",
      "Payment Status", "Fulfillment Method", "Fulfillment Status",
      "Shipping State", "Shipping City",
      "Product", "SKU", "Color", "Size", "Qty", "Unit Price", "Line Total",
      "Personalization Name", "Personalization Number",
      "Fundraising Amount",
    ];

    const rows = items.map((item) => {
      const o = orderMap.get(item.order_id);
      const fundraising = pct > 0 ? Number(item.line_total) * (pct / 100) : 0;
      return [
        o?.order_number ?? "",
        o ? new Date(o.created_at).toLocaleDateString() : "",
        o?.customer_name ?? "",
        o?.customer_email ?? "",
        o ? Number(o.subtotal).toFixed(2) : "",
        o ? Number(o.tax_total).toFixed(2) : "",
        o ? Number(o.shipping_total).toFixed(2) : "",
        o ? Number(o.discount_total).toFixed(2) : "",
        o ? Number(o.total).toFixed(2) : "",
        o?.payment_status ?? "",
        o?.fulfillment_method ?? "",
        o?.fulfillment_status ?? "",
        o?.shipping_state ?? "",
        o?.shipping_city ?? "",
        itemDisplayName(item),
        item.catalog_sku ?? "",
        itemColor(item),
        itemSize(item),
        item.quantity,
        Number(item.unit_price).toFixed(2),
        Number(item.line_total).toFixed(2),
        item.personalization_name ?? "",
        item.personalization_number ?? "",
        fundraising.toFixed(2),
      ];
    });

    downloadCSV(`${store.name}-full-export.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <ReportBackLink />
      <h3 className="text-lg font-semibold text-foreground">Data Export</h3>

      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Full Raw Data Export</p>
            <p className="text-sm text-muted-foreground mt-1">
              Download all order and line-item data including personalization, pricing, and fundraising fields.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? "Loading…" : `${orders.length} orders • ${items.length} line items`}
            </p>
          </div>
          <Button onClick={exportFull} disabled={isLoading || items.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Download Full CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
