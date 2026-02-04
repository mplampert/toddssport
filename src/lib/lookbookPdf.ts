import jsPDF from 'jspdf';

interface PackageItem {
  name: string;
  type: string;
  priceRange: string;
  imageUrl?: string;
  isFromCatalog: boolean;
}

interface LookbookPackage {
  name: string;
  tagline: string;
  description: string;
  items: PackageItem[];
  totalRange: string;
  marketingCopy: string;
}

interface LookbookData {
  packages: LookbookPackage[];
  overallIntro: string;
  closingCTA: string;
  teamName: string;
  sport: string;
  level: string;
  colors: string;
  budget: string;
}

// Convert special characters to ASCII equivalents
function sanitizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, '--')
    .replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
}

// Brand colors
const COLORS = {
  navy: [26, 54, 93] as [number, number, number],
  accent: [245, 158, 11] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export async function generateLookbookPDF(data: LookbookData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper: Draw page header
  const drawHeader = () => {
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("TODD'S SPORTING GOODS", margin, 10);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText(data.teamName), pageWidth - margin, 10, { align: 'right' });
  };

  // Helper: Draw page footer
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(...COLORS.lightGray);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(8);
    doc.text('Your Team. Our Priority.', margin, pageHeight - 10);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  // ============ COVER PAGE ============
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, pageHeight * 0.4, 'F');

  // Logo placeholder text
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("TODD'S", pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('SPORTING GOODS', pageWidth / 2, 58, { align: 'center' });

  // Team name
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitizeText(data.teamName), pageWidth / 2, pageHeight * 0.5, { align: 'center' });

  // Sport and level
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  let subtitle = data.sport.charAt(0).toUpperCase() + data.sport.slice(1);
  if (data.level) subtitle += ` • ${data.level}`;
  doc.text(sanitizeText(subtitle), pageWidth / 2, pageHeight * 0.5 + 12, { align: 'center' });

  // Colors
  if (data.colors) {
    doc.setFontSize(11);
    doc.text(`Team Colors: ${sanitizeText(data.colors)}`, pageWidth / 2, pageHeight * 0.5 + 22, { align: 'center' });
  }

  // Intro text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const introLines = doc.splitTextToSize(sanitizeText(data.overallIntro), contentWidth - 20);
  doc.text(introLines, pageWidth / 2, pageHeight * 0.65, { align: 'center' });

  // Accent line
  doc.setFillColor(...COLORS.accent);
  doc.rect(pageWidth / 2 - 30, pageHeight * 0.58, 60, 1, 'F');

  // "Concept Lookbook" label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.accent);
  doc.text('CONCEPT LOOKBOOK', pageWidth / 2, pageHeight * 0.85, { align: 'center' });

  // ============ PACKAGE PAGES ============
  const totalPages = data.packages.length + 2; // Cover + packages + CTA

  data.packages.forEach((pkg, index) => {
    doc.addPage();
    drawHeader();

    let y = 30;

    // Package number badge
    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(margin, y, 50, 8, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`PACKAGE ${index + 1}`, margin + 25, y + 5.5, { align: 'center' });

    y += 18;

    // Package name and price
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(pkg.name), margin, y);
    
    doc.setTextColor(...COLORS.accent);
    doc.setFontSize(18);
    doc.text(sanitizeText(pkg.totalRange), pageWidth - margin, y, { align: 'right' });
    
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(8);
    doc.text('per player', pageWidth - margin, y + 6, { align: 'right' });

    y += 8;

    // Tagline
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text(sanitizeText(pkg.tagline), margin, y);

    y += 10;

    // Description
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(sanitizeText(pkg.description), contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 8;

    // Items section header
    doc.setFillColor(...COLORS.lightGray);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INCLUDED ITEMS', margin + 3, y + 5.5);
    y += 14;

    // Items grid
    const itemsPerRow = 2;
    const itemWidth = (contentWidth - 5) / itemsPerRow;
    const itemHeight = 18;

    pkg.items.forEach((item, itemIndex) => {
      const col = itemIndex % itemsPerRow;
      const row = Math.floor(itemIndex / itemsPerRow);
      const x = margin + (col * (itemWidth + 5));
      const itemY = y + (row * (itemHeight + 3));

      // Item card
      doc.setDrawColor(...COLORS.lightGray);
      doc.setFillColor(...COLORS.white);
      doc.roundedRect(x, itemY, itemWidth, itemHeight, 2, 2, 'FD');

      // Item name
      doc.setTextColor(...COLORS.navy);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeText(item.name), x + 3, itemY + 6);

      // Item type
      doc.setTextColor(...COLORS.gray);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(item.type.toUpperCase(), x + 3, itemY + 11);

      // Price
      doc.setTextColor(...COLORS.accent);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizeText(item.priceRange), x + itemWidth - 3, itemY + 6, { align: 'right' });

      // In Stock badge
      if (item.isFromCatalog) {
        doc.setFillColor(...COLORS.accent);
        doc.roundedRect(x + itemWidth - 20, itemY + 10, 17, 5, 1, 1, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(5);
        doc.text('IN STOCK', x + itemWidth - 11.5, itemY + 13.5, { align: 'center' });
      }
    });

    const itemRows = Math.ceil(pkg.items.length / itemsPerRow);
    y += (itemRows * (itemHeight + 3)) + 10;

    // Marketing copy
    if (y < pageHeight - 50) {
      doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2], 0.1);
      doc.setDrawColor(...COLORS.accent);
      
      const copyLines = doc.splitTextToSize(sanitizeText(pkg.marketingCopy), contentWidth - 20);
      const copyHeight = copyLines.length * 5 + 10;
      
      doc.setFillColor(255, 250, 240);
      doc.roundedRect(margin, y, contentWidth, copyHeight, 2, 2, 'F');
      doc.setDrawColor(...COLORS.accent);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin, y + copyHeight);
      
      doc.setTextColor(...COLORS.gray);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(copyLines, margin + 8, y + 7);
    }

    drawFooter(index + 2, totalPages);
  });

  // ============ CTA PAGE ============
  doc.addPage();
  drawHeader();

  let ctaY = pageHeight * 0.35;

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Ready to Get Started?', pageWidth / 2, ctaY, { align: 'center' });

  ctaY += 15;

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const ctaLines = doc.splitTextToSize(sanitizeText(data.closingCTA), contentWidth - 40);
  doc.text(ctaLines, pageWidth / 2, ctaY, { align: 'center' });

  ctaY += ctaLines.length * 6 + 20;

  // Contact box
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(pageWidth / 2 - 50, ctaY, 100, 30, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("TODD'S SPORTING GOODS", pageWidth / 2, ctaY + 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Team. Our Priority.', pageWidth / 2, ctaY + 20, { align: 'center' });

  // Accent bar
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.text('Contact your Todd\'s representative today', pageWidth / 2, pageHeight - 12, { align: 'center' });

  drawFooter(totalPages, totalPages);

  return doc.output('blob');
}
