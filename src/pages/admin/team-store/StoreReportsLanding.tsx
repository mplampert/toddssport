import { useNavigate } from "react-router-dom";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { useStoreReportData, downloadCSV, itemDisplayName, itemSize, itemColor, itemDecorationType } from "@/hooks/useStoreReportData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Heart, FileText, Receipt, FileSpreadsheet,
  ClipboardList, Users, Truck,
  Eye, Download, Mail, Printer,
} from "lucide-react";

export default function StoreReports() {
  const { store } = useTeamStoreContext();
  const navigate = useNavigate();
  const { orders, items } = useStoreReportData(store.id);
  const pct = store.fundraising_percent ?? 0;
  const isClosed = store.status === "closed";
  const base = `/admin/team-stores/${store.id}/reports`;

  const orderMap = new Map(orders.map((o) => [o.id, o]));

  // ── CSV helpers (inline so user can export right from the landing page) ──

  const exportProductCSV = () => {
    const map = new Map<string, { name: string; sku: string; units: number; sales: number }>();
    items.forEach((i) => {
      const name = itemDisplayName(i);
      const sku = i.catalog_sku ?? "—";
      const key = `${name}|||${sku}`;
      const c = map.get(key) ?? { name, sku, units: 0, sales: 0 };
      c.units += Number(i.quantity);
      c.sales += Number(i.line_total);
      map.set(key, c);
    });
    downloadCSV(
      `${store.name}-summary.csv`,
      ["Product", "SKU", "Units", "Sales"],
      Array.from(map.values()).map((p) => [p.name, p.sku, p.units, p.sales.toFixed(2)])
    );
  };

  const exportFundraisingCSV = () => {
    downloadCSV(
      `${store.name}-fundraising.csv`,
      ["Order ID", "Customer", "Total", "Raised"],
      orders.map((o) => [o.order_number, o.customer_name ?? "", Number(o.total).toFixed(2), (Number(o.total) * (pct / 100)).toFixed(2)])
    );
  };

  const exportOrdersCSV = () => {
    downloadCSV(
      `${store.name}-orders.csv`,
      ["Order", "Date", "Customer", "Email", "Total", "Payment", "Fulfillment"],
      orders.map((o) => [o.order_number, new Date(o.created_at).toLocaleDateString(), o.customer_name ?? "", o.customer_email ?? "", Number(o.total).toFixed(2), o.payment_status, o.fulfillment_method])
    );
  };

  const exportTaxCSV = () => {
    const map = new Map<string, { jurisdiction: string; taxable: number; tax: number }>();
    orders.forEach((o) => {
      const j = o.shipping_state || "Unknown";
      const c = map.get(j) ?? { jurisdiction: j, taxable: 0, tax: 0 };
      c.taxable += Number(o.subtotal);
      c.tax += Number(o.tax_total);
      map.set(j, c);
    });
    downloadCSV(
      `${store.name}-sales-tax.csv`,
      ["Jurisdiction", "Taxable Sales", "Tax Collected"],
      Array.from(map.values()).map((t) => [t.jurisdiction, t.taxable.toFixed(2), t.tax.toFixed(2)])
    );
  };

  const exportFullCSV = () => {
    const headers = [
      "Order ID", "Date", "Customer", "Email", "Subtotal", "Tax", "Shipping", "Discount", "Total",
      "Payment", "Fulfillment", "Product", "SKU", "Color", "Size", "Qty", "Unit Price", "Line Total",
      "Personalization Name", "Personalization Number", "Fundraising",
    ];
    const rows = items.map((item) => {
      const o = orderMap.get(item.order_id);
      return [
        o?.order_number ?? "", o ? new Date(o.created_at).toLocaleDateString() : "",
        o?.customer_name ?? "", o?.customer_email ?? "",
        o ? Number(o.subtotal).toFixed(2) : "", o ? Number(o.tax_total).toFixed(2) : "",
        o ? Number(o.shipping_total).toFixed(2) : "", o ? Number(o.discount_total).toFixed(2) : "",
        o ? Number(o.total).toFixed(2) : "", o?.payment_status ?? "", o?.fulfillment_method ?? "",
        itemDisplayName(item), item.catalog_sku ?? "", itemColor(item), itemSize(item),
        item.quantity, Number(item.unit_price).toFixed(2), Number(item.line_total).toFixed(2),
        item.personalization_name ?? "", item.personalization_number ?? "",
        pct > 0 ? (Number(item.line_total) * (pct / 100)).toFixed(2) : "0.00",
      ];
    });
    downloadCSV(`${store.name}-full-export.csv`, headers, rows);
  };

  const exportWorkOrdersCSV = () => {
    downloadCSV(
      `${store.name}-work-orders.csv`,
      ["Product", "Decoration", "Size", "Qty"],
      items.map((i) => [itemDisplayName(i), itemDecorationType(i), itemSize(i), i.quantity])
    );
  };

  const exportPackingCSV = () => {
    downloadCSV(
      `${store.name}-packing.csv`,
      ["Recipient", "Order", "Product", "Size", "Qty"],
      items.map((i) => {
        const o = orderMap.get(i.order_id);
        return [o?.customer_name ?? "", o?.order_number ?? "", itemDisplayName(i), itemSize(i), i.quantity];
      })
    );
  };

  // ── Report cards ──

  const reportCards = [
    {
      icon: BarChart3,
      title: "Store Summary",
      desc: "Total orders, items sold, sales, fundraising, and average order value with product/size breakdown.",
      buttons: [
        { label: "View", icon: Eye, accent: true, onClick: () => navigate(`${base}/summary`) },
        { label: "CSV", icon: Download, onClick: exportProductCSV },
        { label: "PDF", icon: Printer, onClick: () => navigate(`${base}/summary`) },
      ],
    },
    {
      icon: Heart,
      title: "Fundraising Report",
      desc: "Total fundraising by product, per order, and per player/team if roster-linked.",
      buttons: [
        { label: "View", icon: Eye, accent: true, onClick: () => navigate(`${base}/fundraising`) },
        { label: "CSV", icon: Download, onClick: exportFundraisingCSV },
        { label: "Email", icon: Mail, onClick: () => navigate(`${base}/fundraising`) },
      ],
    },
    {
      icon: FileText,
      title: "Order Summary",
      desc: "Order-level report with filters for paid/unpaid, pickup location, and shipping method.",
      buttons: [
        { label: "View", icon: Eye, accent: true, onClick: () => navigate(`${base}/orders`) },
        { label: "CSV", icon: Download, onClick: exportOrdersCSV },
      ],
    },
    {
      icon: Receipt,
      title: "Sales Tax Report",
      desc: "Summarized tax by jurisdiction for the store's date range.",
      buttons: [
        { label: "View", icon: Eye, accent: true, onClick: () => navigate(`${base}/tax`) },
        { label: "CSV", icon: Download, onClick: exportTaxCSV },
      ],
    },
    {
      icon: FileSpreadsheet,
      title: "Data Export",
      desc: "Export all raw order line items for custom spreadsheets or external systems.",
      buttons: [
        { label: "Download Full CSV", icon: Download, accent: true, onClick: exportFullCSV },
      ],
    },
  ];

  const fulfillmentCards = [
    {
      icon: ClipboardList,
      title: "Work Orders",
      desc: "Grouped by product and decoration type. Shows what to print, embroider, or DTF.",
      buttons: [
        { label: "View", icon: Eye, accent: true, onClick: () => navigate(`${base}/work-orders`) },
        { label: "PDF", icon: Printer },
        { label: "CSV", icon: Download, onClick: exportWorkOrdersCSV },
      ],
    },
    {
      icon: Users,
      title: "Sorting / Packing Lists",
      desc: "Player/recipient-based lists showing who gets what sizes and items. Great for bagging and distribution.",
      buttons: [
        { label: "Generate", icon: Users, accent: true, onClick: () => navigate(`${base}/packing`) },
        { label: "PDF", icon: Printer },
        { label: "CSV", icon: Download, onClick: exportPackingCSV },
      ],
    },
    {
      icon: Truck,
      title: "Supplier POs",
      desc: "Generate purchase orders for S&S and other suppliers, grouped by supplier SKU.",
      buttons: [
        { label: "Generate", icon: Truck, accent: true, onClick: () => navigate(`${base}/pos`) },
        { label: "View", icon: Eye, onClick: () => navigate(`${base}/pos`) },
        { label: "PDF", icon: Printer },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Key metrics and exportable reports for {store.name}
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportCards.map((card) => (
          <ReportCard key={card.title} {...card} />
        ))}
      </div>

      {/* Fulfillment Section */}
      <div>
        <div className="flex items-baseline gap-3 mb-1">
          <h3 className="text-xl font-bold text-foreground">Fulfillment</h3>
          {!isClosed && (
            <span className="text-sm text-destructive italic">(Available after store closes)</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Production documents and fulfillment tools
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fulfillmentCards.map((card) => (
            <ReportCard key={card.title} {...card} disabled={!isClosed} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ReportCardProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  buttons: { label: string; icon: React.ElementType; accent?: boolean; onClick?: () => void }[];
  disabled?: boolean;
}

function ReportCard({ icon: Icon, title, desc, buttons, disabled }: ReportCardProps) {
  return (
    <Card className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {buttons.map((btn) => (
            <Button
              key={btn.label}
              variant={btn.accent ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={btn.onClick}
              disabled={disabled}
            >
              <btn.icon className="w-3.5 h-3.5 mr-1" />
              {btn.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
