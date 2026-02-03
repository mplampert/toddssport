import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductForFlyer {
  imageUrl?: string;
  title: string;
  description?: string;
  priceLine?: string;
}

interface FlyerData {
  flyerId?: string;  // If provided, update existing flyer
  flyerName?: string;
  clientName?: string;
  products: ProductForFlyer[];
  notesCta?: string;
}

// Helper to convert Uint8Array to base64 without stack overflow
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // Process in 32KB chunks to avoid call stack limits
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

// Helper to fetch image and convert to base64 data URL
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log('Image fetch failed:', response.status, url);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Use chunked conversion to avoid stack overflow
    const base64 = uint8ArrayToBase64(bytes);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

// Helper to get image format from URL or content type
function getImageFormat(url: string): 'PNG' | 'JPEG' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('jpeg')) {
    return 'JPEG';
  }
  return 'PNG';
}

// Helper to fix smart quotes and special characters
function cleanText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes
    .replace(/\u2013/g, '-')          // En dash
    .replace(/\u2014/g, '--')         // Em dash
    .replace(/\u2026/g, '...')        // Ellipsis
    .replace(/\u00A0/g, ' ');         // Non-breaking space
}

// Helper to wrap text to max lines with ellipsis truncation
function wrapTextWithEllipsis(doc: jsPDF, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (doc.getTextWidth(testLine) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length >= maxLines) break;
      }
      currentLine = word;
      // If single word is too long, truncate it
      while (doc.getTextWidth(currentLine) > maxWidth && currentLine.length > 3) {
        currentLine = currentLine.slice(0, -1);
      }
    }
  }
  
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  // Add ellipsis to last line if we truncated
  if (lines.length === maxLines && words.length > 0) {
    const allText = words.join(' ');
    const shownText = lines.join(' ');
    if (allText.length > shownText.length) {
      let lastLine = lines[maxLines - 1];
      while (doc.getTextWidth(lastLine + '...') > maxWidth && lastLine.length > 3) {
        lastLine = lastLine.slice(0, -1).trim();
      }
      lines[maxLines - 1] = lastLine + '...';
    }
  }

  return lines;
}

// Generate PDF using jsPDF
async function generateFlyerPDF(data: FlyerData, logoBase64: string | null): Promise<Uint8Array> {
  // Create PDF - Letter size (8.5 x 11 inches)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.5;
  const contentWidth = pageWidth - (margin * 2);

  // Colors
  const redColor = '#dc2626';
  const darkColor = '#1f2937';
  const grayColor = '#6b7280';
  const lightGrayColor = '#e5e7eb';
  const mutedGray = '#9ca3af';

  // ===== WHITE BACKGROUND =====
  doc.setFillColor('#ffffff');
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== RED BORDER =====
  const borderPadding = 0.12;
  doc.setDrawColor(redColor);
  doc.setLineWidth(0.035);
  doc.roundedRect(
    margin - borderPadding, 
    margin - borderPadding, 
    contentWidth + (borderPadding * 2), 
    pageHeight - (margin * 2) + (borderPadding * 2), 
    0.08, 0.08, 'S'
  );

  let y = margin + 0.15;

  // ===== HEADER =====
  // Logo on left
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin + 0.05, y, 1.3, 0.5);
    } catch (e) {
      console.log('Could not add logo:', e);
    }
  }

  // Client name on right - LARGE and prominent
  if (data.clientName) {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor);
    const clientName = cleanText(data.clientName);
    doc.text(clientName, pageWidth - margin - 0.05, y + 0.28, { align: 'right' });
  }

  // Tagline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(redColor);
  doc.text('CUSTOM TEAM APPAREL & PROMOTIONAL PRODUCTS', pageWidth - margin - 0.05, y + 0.48, { align: 'right' });

  y += 0.7;

  // Header divider
  doc.setDrawColor(lightGrayColor);
  doc.setLineWidth(0.01);
  doc.line(margin, y, pageWidth - margin, y);
  y += 0.2;

  // ===== PRODUCTS GRID =====
  const products = data.products.slice(0, 6); // Max 6 products
  const productCount = products.length;
  
  // Always use 2 columns
  const cols = 2;
  const rows = Math.ceil(productCount / cols);
  
  // Calculate cell dimensions - ensure equal heights
  const footerHeight = 0.7;
  const availableHeight = pageHeight - y - margin - footerHeight - 0.15;
  const gapX = 0.15;
  const gapY = 0.12;
  
  const cellWidth = (contentWidth - gapX) / cols;
  const cellHeight = (availableHeight - (gapY * (rows - 1))) / rows;
  const cellPadding = 0.12;

  // Pre-fetch all product images
  const productImages: (string | null)[] = [];
  for (const product of products) {
    if (product.imageUrl && product.imageUrl.trim()) {
      const imgData = await fetchImageAsBase64(product.imageUrl);
      productImages.push(imgData);
    } else {
      productImages.push(null);
    }
  }

  // Fixed layout proportions for consistent tiles
  const imageHeightRatio = 0.48; // Image takes ~48% of cell height
  const priceAreaHeight = 0.35; // Reserve space for price at bottom

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const cellX = margin + (col * (cellWidth + gapX));
    const cellY = y + (row * (cellHeight + gapY));

    // Cell background - clean white with subtle border
    doc.setFillColor('#ffffff');
    doc.setDrawColor(lightGrayColor);
    doc.setLineWidth(0.008);
    doc.roundedRect(cellX, cellY, cellWidth, cellHeight, 0.05, 0.05, 'FD');

    // ===== IMAGE AREA (top portion) =====
    const imgData = productImages[i];
    const imageAreaHeight = cellHeight * imageHeightRatio;
    const imageY = cellY + cellPadding;
    const imageWidth = cellWidth - (cellPadding * 2);
    const imageHeight = imageAreaHeight - cellPadding;

    if (imgData) {
      try {
        const format = getImageFormat(product.imageUrl || '');
        // Center image in the image area
        doc.addImage(
          imgData, 
          format, 
          cellX + cellPadding, 
          imageY, 
          imageWidth, 
          imageHeight
        );
      } catch (e) {
        console.log('Could not add product image:', e);
      }
    } else {
      // Subtle "No Image" text instead of a box
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(mutedGray);
      doc.text('No image provided', cellX + (cellWidth / 2), imageY + (imageHeight / 2), { align: 'center' });
    }

    // ===== TEXT AREA (middle portion) =====
    let textY = cellY + imageAreaHeight + 0.08;
    const textMaxWidth = cellWidth - (cellPadding * 2);

    // Product title - BOLD, wrap to 2 lines max with ellipsis
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor);
    const title = cleanText(product.title || 'Product');
    const titleLines = wrapTextWithEllipsis(doc, title, textMaxWidth, 2);
    
    const lineHeight = 0.16;
    for (const line of titleLines) {
      doc.text(line, cellX + cellPadding, textY);
      textY += lineHeight;
    }
    textY += 0.04; // Small gap after title

    // Product description - max 3 lines with ellipsis
    if (product.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(grayColor);
      
      const desc = cleanText(product.description.replace(/\n/g, ' ').replace(/\s+/g, ' '));
      const descLines = wrapTextWithEllipsis(doc, desc, textMaxWidth, 3);
      
      const descLineHeight = 0.13;
      for (const line of descLines) {
        doc.text(line, cellX + cellPadding, textY);
        textY += descLineHeight;
      }
    }

    // ===== PRICE (bottom of cell) =====
    if (product.priceLine) {
      const priceY = cellY + cellHeight - cellPadding - 0.05;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(redColor);
      
      let price = cleanText(product.priceLine);
      // Add $ if not present and looks like a number
      if (/^\d/.test(price) && !price.startsWith('$')) {
        price = '$' + price;
      }
      // Add "each" if just a price
      if (/^\$[\d.]+$/.test(price)) {
        price = price + ' each';
      }
      
      doc.text(price, cellX + cellPadding, priceY);
    }
  }

  // ===== FOOTER =====
  const footerY = pageHeight - margin - footerHeight + 0.08;

  // Footer divider
  doc.setDrawColor(lightGrayColor);
  doc.setLineWidth(0.01);
  doc.line(margin, footerY - 0.08, pageWidth - margin, footerY - 0.08);

  // CTA box (red banner) - more compact
  if (data.notesCta) {
    doc.setFillColor(redColor);
    doc.roundedRect(margin, footerY - 0.02, contentWidth, 0.32, 0.05, 0.05, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    doc.text(cleanText(data.notesCta), pageWidth / 2, footerY + 0.18, { align: 'center' });
  }

  // Footer info - single clean line
  const infoY = data.notesCta ? footerY + 0.45 : footerY + 0.1;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor);
  
  // Left side: company info
  doc.text("Todd's Sporting Goods — Your Partner in Team & Promotional Apparel", margin, infoY);
  // Right side: website
  doc.text('toddssport.lovable.app', pageWidth - margin, infoY, { align: 'right' });

  // Return PDF as Uint8Array
  const pdfOutput = doc.output('arraybuffer');
  return new Uint8Array(pdfOutput);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: FlyerData = await req.json();
    console.log('Generating PDF flyer with', body.products?.length || 0, 'products');

    if (!body.products || body.products.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one product is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch logo
    const logoUrl = 'https://ookvohtvmjcgrfahigyr.supabase.co/storage/v1/object/public/brand-logos/todds-logo.png';
    const logoBase64 = await fetchImageAsBase64(logoUrl);

    // Generate PDF
    const pdfBytes = await generateFlyerPDF(body, logoBase64);
    console.log('PDF generated, size:', pdfBytes.length, 'bytes');

    // Use existing ID or generate new one
    const flyerId = body.flyerId || crypto.randomUUID();
    const pdfFileName = `${flyerId}.pdf`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from('flyers')
      .upload(pdfFileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,  // Overwrite if exists
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get public URL with cache-busting timestamp
    const { data: urlData } = supabaseClient.storage
      .from('flyers')
      .getPublicUrl(pdfFileName);

    const pdfUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    console.log('PDF uploaded to:', pdfUrl);

    let flyer;
    
    if (body.flyerId) {
      // Update existing flyer
      const { data: updatedFlyer, error: updateError } = await supabaseClient
        .from('flyers')
        .update({
          product_name: body.flyerName || `Flyer - ${body.products.length} products`,
          client_name: body.clientName || null,
          products: body.products,
          notes_cta: body.notesCta || null,
          pdf_url: pdfUrl,
        })
        .eq('id', body.flyerId)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update flyer: ${updateError.message}`);
      }
      
      flyer = updatedFlyer;
      console.log('Flyer updated:', flyer.id);
    } else {
      // Insert new flyer record
      const { data: newFlyer, error: insertError } = await supabaseClient
        .from('flyers')
        .insert({
          id: flyerId,
          product_name: body.flyerName || `Flyer - ${body.products.length} products`,
          client_name: body.clientName || null,
          products: body.products,
          notes_cta: body.notesCta || null,
          pdf_url: pdfUrl,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to save flyer: ${insertError.message}`);
      }
      
      flyer = newFlyer;
      console.log('Flyer created:', flyer.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        flyer,
        downloadUrl: pdfUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating flyer:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
