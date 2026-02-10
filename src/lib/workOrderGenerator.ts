import jsPDF from "jspdf";
import type { StoreOrder, StoreOrderItem } from "@/hooks/useStoreReportData";
import { itemDisplayName, itemSize, itemColor, itemDecorationType, downloadCSV } from "@/hooks/useStoreReportData";
import type { FulfillmentBatch } from "@/hooks/useFulfillmentBatches";

/* ---------- helpers to extract decoration details from snapshot ---------- */

interface DecorationInfo {
  method: string;
  location: string;
  notes: string;
  artName: string;
  colors: string;
}

function parseDecorations(item: StoreOrderItem): DecorationInfo[] {
  if (!item.decoration_snapshot) return [{ method: "None", location: "—", notes: "", artName: "—", colors: "—" }];
  const raw = typeof item.decoration_snapshot === "string"
    ? JSON.parse(item.decoration_snapshot)
    : item.decoration_snapshot;
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length === 0) return [{ method: "None", location: "—", notes: "", artName: "—", colors: "—" }];
  return list.map((d: any) => ({
    method: d.method || d.type || d.process || "Decoration",
    location: d.location || d.placement || d.position || "—",
    notes: d.notes || d.note || "",
    artName: d.artFile || d.art_file || d.logo_name || d.logoName || "—",
    colors: d.colors || d.thread_colors || d.ink_colors || "—",
  }));
}

/* ---------- Work order row type ---------- */

export interface WorkOrderRow {
  product: string;
  sku: string;
  color: string;
  size: string;
  qty: number;
  process: string;
  location: string;
  notes: string;
  orderId: string;
  orderNumber: string;
}

/* ---------- Build flat rows from batch data ---------- */

export function buildWorkOrderRows(
  items: StoreOrderItem[],
  orderMap: Map<string, StoreOrder>,
): WorkOrderRow[] {
  const rows: WorkOrderRow[] = [];
  items.forEach((item) => {
    const o = orderMap.get(item.order_id);
    const decorations = parseDecorations(item);
    decorations.forEach((dec) => {
      rows.push({
        product: itemDisplayName(item),
        sku: item.catalog_sku ?? "—",
        color: itemColor(item),
        size: itemSize(item),
        qty: Number(item.quantity),
        process: dec.method,
        location: dec.location,
        notes: dec.notes,
        orderId: item.order_id,
        orderNumber: o?.order_number ?? "—",
      });
    });
  });
  return rows;
}

/* ---------- Build artwork summary ---------- */

export interface ArtworkSummary {
  process: string;
  artName: string;
  colors: string;
  garmentColors: string[];
  notes: string;
}

export function buildArtworkSummary(items: StoreOrderItem[]): ArtworkSummary[] {
  const map = new Map<string, ArtworkSummary>();
  items.forEach((item) => {
    const decorations = parseDecorations(item);
    const garmentColor = itemColor(item);
    decorations.forEach((dec) => {
      if (dec.method === "None") return;
      const key = `${dec.method}|||${dec.artName}`;
      if (!map.has(key)) {
        map.set(key, {
          process: dec.method,
          artName: dec.artName,
          colors: dec.colors,
          garmentColors: [],
          notes: dec.notes,
        });
      }
      const entry = map.get(key)!;
      if (garmentColor !== "—" && !entry.garmentColors.includes(garmentColor)) {
        entry.garmentColors.push(garmentColor);
      }
      if (dec.notes && !entry.notes.includes(dec.notes)) {
        entry.notes = entry.notes ? `${entry.notes}; ${dec.notes}` : dec.notes;
      }
    });
  });
  return Array.from(map.values());
}

/* ---------- CSV export ---------- */

export function downloadWorkOrderCSV(
  batch: FulfillmentBatch & { store_name: string },
  rows: WorkOrderRow[],
) {
  const headers = ["Product", "SKU", "Color", "Size", "Qty", "Process", "Decoration Location", "Notes", "Order #"];
  const csvRows = rows.map((r) => [
    r.product, r.sku, r.color, r.size, r.qty, r.process, r.location, r.notes, r.orderNumber,
  ]);
  downloadCSV(`work-order-${batch.id.slice(0, 8)}.csv`, headers, csvRows);
}

/* ---------- PDF generation ---------- */

export function generateWorkOrderPDF(
  batch: FulfillmentBatch & { store_name: string },
  orders: StoreOrder[],
  rows: WorkOrderRow[],
  artwork: ArtworkSummary[],
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const totalItems = rows.reduce((s, r) => s + r.qty, 0);
  const batchTypeLabel = batch.batch_type === "manual" ? "Forced / Manual" : "Scheduled";

  /* ---- Header ---- */
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("WORK ORDER", margin, y + 6);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const headerLines = [
    [`Store: ${batch.store_name}`, `Batch ID: ${batch.id.slice(0, 8)}`],
    [`Batch Type: ${batchTypeLabel}`, `Created: ${new Date(batch.created_at).toLocaleString()}`],
    [`Dealer: Todd's Sporting Goods`, `Orders: ${orders.length}  |  Items: ${totalItems}`],
    [`Cutoff: ${new Date(batch.cutoff_datetime).toLocaleString()}`, ``],
  ];
  headerLines.forEach(([left, right]) => {
    doc.text(left, margin, y);
    if (right) doc.text(right, pageW / 2, y);
    y += 4.5;
  });

  // Divider
  y += 2;
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  /* ---- Items to Produce ---- */
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ITEMS TO PRODUCE", margin, y);
  y += 6;

  // Group rows by process
  const byProcess = new Map<string, WorkOrderRow[]>();
  rows.forEach((r) => {
    const list = byProcess.get(r.process) || [];
    list.push(r);
    byProcess.set(r.process, list);
  });

  const colWidths = [55, 30, 25, 18, 14, 40, 60, 30]; // product, sku, color, size, qty, location, notes, order
  const colHeaders = ["Product", "Vendor SKU", "Color", "Size", "Qty", "Dec. Location", "Notes", "Order #"];

  byProcess.forEach((processRows, processName) => {
    // Check page space
    if (y > pageH - 30) { doc.addPage(); y = margin; }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Process: ${processName}`, margin, y);
    y += 5;

    // Table header
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 3, pageW - margin * 2, 5, "F");
    let x = margin;
    colHeaders.forEach((h, i) => {
      doc.text(h, x + 1, y);
      x += colWidths[i];
    });
    y += 5;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    processRows.forEach((row) => {
      if (y > pageH - 12) { doc.addPage(); y = margin; }
      x = margin;
      const vals = [row.product, row.sku, row.color, row.size, String(row.qty), row.location, row.notes, row.orderNumber];
      vals.forEach((v, i) => {
        // Truncate long values
        const maxChars = Math.floor(colWidths[i] / 1.8);
        const txt = v.length > maxChars ? v.slice(0, maxChars - 1) + "…" : v;
        doc.text(txt, x + 1, y);
        x += colWidths[i];
      });
      y += 4;
    });

    y += 4;
  });

  /* ---- Artwork & Decoration section ---- */
  if (artwork.length > 0) {
    if (y > pageH - 40) { doc.addPage(); y = margin; }

    y += 2;
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ARTWORK & DECORATION", margin, y);
    y += 7;

    artwork.forEach((art) => {
      if (y > pageH - 25) { doc.addPage(); y = margin; }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(art.process, margin, y);
      y += 4.5;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Art File: ${art.artName}`, margin + 2, y); y += 3.5;
      doc.text(`Decoration Colors: ${art.colors}`, margin + 2, y); y += 3.5;
      if (art.garmentColors.length > 0) {
        doc.text(`Garment Color(s): ${art.garmentColors.join(", ")}`, margin + 2, y); y += 3.5;
      }
      if (art.notes) {
        doc.text(`Notes: ${art.notes}`, margin + 2, y); y += 3.5;
      }
      y += 3;
    });
  }

  /* ---- Footer on each page ---- */
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(
      `Work Order – Batch ${batch.id.slice(0, 8)} – ${batch.store_name} – Page ${p}/${totalPages}`,
      margin,
      pageH - 5,
    );
    doc.setTextColor(0);
  }

  doc.save(`work-order-${batch.id.slice(0, 8)}.pdf`);
}
