import jsPDF from "jspdf";

interface OrderItem {
  store_display_name?: string;
  product_name_snapshot?: string;
  variant_snapshot?: any;
  quantity: number;
  unit_price: number;
  line_total: number;
  personalization_name?: string;
  personalization_number?: string;
}

interface OrderPdfData {
  orderNumber: string;
  date: string;
  customerName: string;
  customerEmail?: string;
  storeName?: string;
  status: string;
  fulfillmentMethod?: string;
  fulfillmentStatus?: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  shippingTotal?: number;
  feesJson?: Array<{ name: string; amount: number }>;
  total: number;
  shippingAddress?: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export function generateOrderPdf(data: OrderPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }
  };

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Order Summary", margin, y);
  y += 28;

  // Order info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const infoLines = [
    `Order #: ${data.orderNumber}`,
    `Date: ${data.date}`,
    `Customer: ${data.customerName}`,
    ...(data.customerEmail ? [`Email: ${data.customerEmail}`] : []),
    ...(data.storeName ? [`Store: ${data.storeName}`] : []),
    `Status: ${data.status}`,
    ...(data.fulfillmentMethod ? [`Fulfillment: ${data.fulfillmentMethod}`] : []),
    ...(data.fulfillmentStatus ? [`Fulfillment Status: ${data.fulfillmentStatus}`] : []),
  ];
  infoLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 14;
  });

  // Shipping address
  if (data.shippingAddress?.address1) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Ship To:", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    if (data.shippingAddress.name) { doc.text(data.shippingAddress.name, margin, y); y += 14; }
    doc.text(data.shippingAddress.address1, margin, y); y += 14;
    if (data.shippingAddress.address2) { doc.text(data.shippingAddress.address2, margin, y); y += 14; }
    const cityLine = [data.shippingAddress.city, data.shippingAddress.state, data.shippingAddress.zip].filter(Boolean).join(", ");
    if (cityLine) { doc.text(cityLine, margin, y); y += 14; }
  }

  // Items table
  y += 16;
  checkPage(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Items", margin, y);
  y += 16;

  // Table header
  doc.setFontSize(9);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 10, contentWidth, 16, "F");
  const cols = [margin, margin + 220, margin + 310, margin + 380, margin + 450];
  doc.text("Product", cols[0] + 4, y);
  doc.text("Details", cols[1] + 4, y);
  doc.text("Qty", cols[2] + 4, y);
  doc.text("Price", cols[3] + 4, y);
  doc.text("Total", cols[4] + 4, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  data.items.forEach((item) => {
    checkPage(50);
    const name = item.store_display_name || item.product_name_snapshot || "Product";
    const variant = item.variant_snapshot || {};
    const details = [variant.color, variant.size].filter(Boolean).join(" / ") || "—";
    const personalization = [
      item.personalization_name ? `Name: ${item.personalization_name}` : "",
      item.personalization_number ? `#${item.personalization_number}` : "",
    ].filter(Boolean).join(" · ");

    doc.text(name.substring(0, 35), cols[0] + 4, y);
    doc.text(details.substring(0, 15), cols[1] + 4, y);
    doc.text(String(item.quantity), cols[2] + 4, y);
    doc.text(fmt(item.unit_price), cols[3] + 4, y);
    doc.text(fmt(item.line_total), cols[4] + 4, y);
    y += 14;

    if (personalization) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`  ${personalization}`, cols[0] + 4, y);
      doc.setTextColor(0);
      doc.setFontSize(9);
      y += 12;
    }

    if (variant.brandName) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`  Brand: ${variant.brandName}`, cols[0] + 4, y);
      doc.setTextColor(0);
      doc.setFontSize(9);
      y += 12;
    }
  });

  // Totals
  y += 10;
  checkPage(100);
  doc.setDrawColor(200);
  doc.line(cols[3], y, margin + contentWidth, y);
  y += 16;

  const totalsLines: [string, string][] = [
    ["Subtotal", fmt(data.subtotal)],
  ];
  if (data.discountTotal && data.discountTotal > 0) totalsLines.push(["Discount", `-${fmt(data.discountTotal)}`]);
  if (data.shippingTotal && data.shippingTotal > 0) totalsLines.push(["Shipping", fmt(data.shippingTotal)]);
  if (data.feesJson) {
    data.feesJson.forEach((fee) => totalsLines.push([fee.name, fmt(fee.amount)]));
  }
  if (data.taxTotal && data.taxTotal > 0) totalsLines.push(["Tax", fmt(data.taxTotal)]);

  doc.setFontSize(10);
  totalsLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.text(label, cols[3] + 4, y);
    doc.text(value, margin + contentWidth - 4, y, { align: "right" });
    y += 16;
  });

  doc.setFont("helvetica", "bold");
  doc.text("Total", cols[3] + 4, y);
  doc.text(fmt(data.total), margin + contentWidth - 4, y, { align: "right" });

  // Save
  doc.save(`Order-${data.orderNumber}.pdf`);
}
