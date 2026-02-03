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

interface RepInfo {
  name: string;
  email: string;
  phone: string | null;
}

interface ClientInfo {
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface FlyerData {
  flyerId?: string;  // If provided, update existing flyer
  flyerName?: string;
  clientName?: string;
  clientContactName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  products: ProductForFlyer[];
  notesCta?: string;
  repId?: string;
  rep?: RepInfo;  // Populated from repId lookup
  clientInfo?: ClientInfo;  // Populated from individual fields
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

// Helper to wrap text to max lines with ellipsis truncation (only at end of last line)
function wrapTextWithEllipsis(doc: jsPDF, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (doc.getTextWidth(testLine) <= maxWidth) {
      currentLine = testLine;
    } else {
      // Current line is full, push it
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length >= maxLines) {
          // We've hit max lines but there's more content - add ellipsis to last line
          let lastLine = lines[lines.length - 1];
          while (doc.getTextWidth(lastLine + '...') > maxWidth && lastLine.length > 3) {
            // Remove last word or characters to make room for ellipsis
            const lastSpaceIdx = lastLine.lastIndexOf(' ');
            if (lastSpaceIdx > 0) {
              lastLine = lastLine.substring(0, lastSpaceIdx);
            } else {
              lastLine = lastLine.slice(0, -1);
            }
          }
          lines[lines.length - 1] = lastLine + '...';
          return lines;
        }
      }
      currentLine = word;
      
      // If single word is too long for the line, truncate it with ellipsis
      if (doc.getTextWidth(currentLine) > maxWidth) {
        while (doc.getTextWidth(currentLine + '...') > maxWidth && currentLine.length > 3) {
          currentLine = currentLine.slice(0, -1);
        }
        currentLine = currentLine + '...';
      }
    }
  }
  
  // Add the last line if we have room
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

// Calculate grid layout based on product count
function getGridLayout(productCount: number): { cols: number; rows: number; layout: (number | -1)[][] } {
  switch (productCount) {
    case 1:
      return { cols: 1, rows: 1, layout: [[0]] };
    case 2:
      return { cols: 2, rows: 1, layout: [[0, 1]] };
    case 3:
      // 3 equal columns
      return { cols: 3, rows: 1, layout: [[0, 1, 2]] };
    case 4:
      // 2x2 grid
      return { cols: 2, rows: 2, layout: [[0, 1], [2, 3]] };
    case 5:
      // 3 on top, 2 centered below (-1 = empty cell)
      return { cols: 3, rows: 2, layout: [[0, 1, 2], [-1, 3, 4]] };
    case 6:
    default:
      // 3x2 grid
      return { cols: 3, rows: 2, layout: [[0, 1, 2], [3, 4, 5]] };
  }
}

// Generate PDF using jsPDF - Matching the React preview layout exactly
async function generateFlyerPDF(data: FlyerData, logoBase64: string | null): Promise<Uint8Array> {
  // Create PDF - Letter size (8.5 x 11 inches)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.4; // Consistent page margins
  const contentWidth = pageWidth - (margin * 2);

  // Colors - matching the preview design system (no red border)
  const primaryColor = '#1a1a2e';  // Dark navy/black for text
  const mutedColor = '#6b7280';    // Gray for secondary text
  const borderColor = '#e5e7eb';   // Light gray for borders
  const accentColor = '#0ea5e9';   // Sky blue accent for prices
  const bgColor = '#ffffff';

  // ===== WHITE BACKGROUND =====
  doc.setFillColor(bgColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  let y = margin;

  // ===== HEADER - Matching preview layout =====
  // Left: Todd's logo
  // Right: "Prepared for" + Client name + Client info
  const hasClientInfo = data.clientInfo && (data.clientInfo.contactName || data.clientInfo.email || data.clientInfo.phone || data.clientInfo.address);
  const headerHeight = hasClientInfo ? 0.9 : 0.6;
  
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, y + 0.05, 1.3, 0.45);
    } catch (e) {
      console.log('Could not add logo:', e);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text("Todd's Sporting Goods", margin, y + 0.3);
    }
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text("Todd's Sporting Goods", margin, y + 0.3);
  }

  // Client name and info on right with "Prepared for" label
  if (data.clientName || hasClientInfo) {
    let clientY = y + 0.15;
    
    // "Prepared for" label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor);
    doc.text('Prepared for', pageWidth - margin, clientY, { align: 'right' });
    clientY += 0.18;
    
    // Client/Team name - larger and bold
    if (data.clientName) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      const clientName = cleanText(data.clientName);
      doc.text(clientName, pageWidth - margin, clientY, { align: 'right' });
      clientY += 0.18;
    }
    
    // Client contact details
    if (data.clientInfo) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedColor);
      
      if (data.clientInfo.contactName) {
        doc.text(cleanText(data.clientInfo.contactName), pageWidth - margin, clientY, { align: 'right' });
        clientY += 0.12;
      }
      if (data.clientInfo.email) {
        doc.text(cleanText(data.clientInfo.email), pageWidth - margin, clientY, { align: 'right' });
        clientY += 0.12;
      }
      if (data.clientInfo.phone) {
        doc.text(cleanText(data.clientInfo.phone), pageWidth - margin, clientY, { align: 'right' });
        clientY += 0.12;
      }
      if (data.clientInfo.address) {
        doc.text(cleanText(data.clientInfo.address), pageWidth - margin, clientY, { align: 'right' });
        clientY += 0.12;
      }
      // City, State ZIP
      const cityStateZip = [
        data.clientInfo.city,
        data.clientInfo.state ? `${data.clientInfo.state}${data.clientInfo.zip ? ' ' + data.clientInfo.zip : ''}` : data.clientInfo.zip
      ].filter(Boolean).join(', ');
      if (cityStateZip) {
        doc.text(cleanText(cityStateZip), pageWidth - margin, clientY, { align: 'right' });
      }
    }
  }

  y += headerHeight;

  // Header divider line
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.015);
  doc.line(margin, y, pageWidth - margin, y);
  y += 0.25;

  // ===== PRODUCTS GRID - Matching preview exactly =====
  // Preview uses 2-column grid always, aspect-square images, line-clamp text
  const products = data.products.filter(p => p.title?.trim()).slice(0, 6);
  const productCount = products.length;
  
  if (productCount === 0) {
    // No products - show placeholder message
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(mutedColor);
    doc.text('Add products to generate flyer', pageWidth / 2, y + 1, { align: 'center' });
  } else {
    // Always use 2-column grid like the preview
    const cols = 2;
    const rows = Math.ceil(productCount / 2);
    
    // Calculate grid dimensions
    const footerHeight = 0.6;
    const availableHeight = pageHeight - y - margin - footerHeight;
    const gapX = 0.15;
    const gapY = 0.15;
    
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

    // Render products in 2-column grid
    for (let i = 0; i < productCount; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const product = products[i];
      
      const cellX = margin + (col * (cellWidth + gapX));
      const cellY = y + (row * (cellHeight + gapY));
      
      // For 1 product, limit the cell height to be more reasonable
      const actualCellHeight = productCount === 1 ? Math.min(cellHeight, 7.5) : cellHeight;

      // Cell background with subtle border
      doc.setFillColor(bgColor);
      doc.setDrawColor(borderColor);
      doc.setLineWidth(0.01);
      doc.roundedRect(cellX, cellY, cellWidth, actualCellHeight, 0.05, 0.05, 'FD');

      // ===== IMAGE AREA - Constrained to fit within card =====
      // Image should take up about 50-55% of cell, leaving room for text
      const maxImageHeight = actualCellHeight * 0.5;
      const maxImageWidth = cellWidth - (cellPadding * 2);
      const imageSize = Math.min(maxImageWidth, maxImageHeight);
      const imageX = cellX + (cellWidth - imageSize) / 2; // Center horizontally
      const imageY = cellY + cellPadding;

      // Light gray background for image area
      doc.setFillColor('#f3f4f6');
      doc.roundedRect(imageX, imageY, imageSize, imageSize, 0.04, 0.04, 'F');

      const imgData = productImages[i];
      if (imgData) {
        try {
          const format = getImageFormat(product.imageUrl || '');
          const imgPadding = imageSize * 0.05;
          doc.addImage(imgData, format, imageX + imgPadding, imageY + imgPadding, imageSize - (imgPadding * 2), imageSize - (imgPadding * 2));
        } catch (e) {
          console.log('Could not add product image:', e);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor('#9ca3af');
          doc.text('No Image', cellX + cellWidth / 2, imageY + imageSize / 2, { align: 'center' });
        }
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor('#9ca3af');
        doc.text('No Image', cellX + cellWidth / 2, imageY + imageSize / 2, { align: 'center' });
      }

      // ===== TEXT CONTENT - ABSOLUTELY bounded within cell =====
      const textStartY = imageY + imageSize + 0.12;
      let textY = textStartY;
      const textMaxWidth = cellWidth - (cellPadding * 2);
      const textX = cellX + cellPadding;
      
      // ABSOLUTE boundaries - nothing can go beyond these
      const cellBottomY = cellY + actualCellHeight;
      const priceHeight = 0.18;
      const priceY = cellBottomY - cellPadding - 0.05;
      const absoluteMaxY = priceY - priceHeight; // Hard ceiling for title + description
      
      console.log(`Cell ${i}: cellY=${cellY.toFixed(2)}, cellHeight=${actualCellHeight.toFixed(2)}, cellBottomY=${cellBottomY.toFixed(2)}, absoluteMaxY=${absoluteMaxY.toFixed(2)}`);

      // Product title - bold, max 2 lines
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      const title = cleanText(product.title || 'Product');
      const titleLineHeight = 0.13;
      
      // Calculate how many title lines we can fit
      const titleSpace = absoluteMaxY - textY;
      const maxTitleLines = Math.min(2, Math.floor(titleSpace / titleLineHeight));
      
      if (maxTitleLines > 0) {
        const titleLines = wrapTextWithEllipsis(doc, title, textMaxWidth, maxTitleLines);
        for (const line of titleLines) {
          if (textY + titleLineHeight > absoluteMaxY) {
            console.log(`Title overflow prevented at textY=${textY.toFixed(2)}`);
            break;
          }
          doc.text(line, textX, textY);
          textY += titleLineHeight;
        }
      }
      textY += 0.03;

      // Product description - STRICTLY bounded, truncate with ellipsis
      if (product.description && textY < absoluteMaxY) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedColor);
        
        const desc = cleanText(product.description.replace(/\n/g, ' ').replace(/\s+/g, ' '));
        const descLineHeight = 0.1;
        
        // Calculate EXACT number of lines that can fit
        const remainingSpace = absoluteMaxY - textY;
        const maxFittingLines = Math.floor(remainingSpace / descLineHeight);
        
        console.log(`Description: remainingSpace=${remainingSpace.toFixed(2)}, maxFittingLines=${maxFittingLines}`);
        
        if (maxFittingLines > 0) {
          const descLines = wrapTextWithEllipsis(doc, desc, textMaxWidth, maxFittingLines);
          
          for (let j = 0; j < descLines.length; j++) {
            // Double-check we won't overflow
            if (textY + descLineHeight > absoluteMaxY) {
              console.log(`Description line ${j} overflow prevented at textY=${textY.toFixed(2)}`);
              break;
            }
            doc.text(descLines[j], textX, textY);
            textY += descLineHeight;
          }
        }
      }

      // ===== PRICE at absolute bottom of cell =====
      if (product.priceLine) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor);
        
        let price = cleanText(product.priceLine);
        if (/^\d/.test(price) && !price.startsWith('$')) {
          price = '$' + price;
        }
        
        doc.text(price, textX, priceY);
      }
    }
  }

  // ===== FOOTER =====
  // Calculate footer height based on content
  const hasRep = data.rep && data.rep.name;
  const hasCta = data.notesCta && data.notesCta.trim();
  const footerContentHeight = (hasRep ? 0.35 : 0) + (hasCta ? 0.18 : 0) + 0.25;
  const footerY = pageHeight - margin - footerContentHeight;

  // Footer divider
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.015);
  doc.line(margin, footerY - 0.05, pageWidth - margin, footerY - 0.05);

  let currentY = footerY;

  // CTA text (if any)
  if (hasCta) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor);
    const ctaText = cleanText(data.notesCta!);
    doc.text(ctaText, pageWidth / 2, currentY + 0.08, { align: 'center' });
    currentY += 0.18;
  }

  // Rep info box
  if (hasRep) {
    const boxX = margin + contentWidth * 0.25;
    const boxWidth = contentWidth * 0.5;
    
    // Light gray background box
    doc.setFillColor('#f9fafb');
    doc.roundedRect(boxX, currentY, boxWidth, 0.32, 0.03, 0.03, 'F');
    
    // "Your Sales Rep" label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor);
    doc.text('YOUR SALES REP', pageWidth / 2, currentY + 0.08, { align: 'center' });
    
    // Rep name
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text(data.rep!.name, pageWidth / 2, currentY + 0.18, { align: 'center' });
    
    // Rep contact info
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor);
    let contactLine = data.rep!.email;
    if (data.rep!.phone) {
      contactLine += ` • ${data.rep!.phone}`;
    }
    doc.text(contactLine, pageWidth / 2, currentY + 0.27, { align: 'center' });
    
    currentY += 0.35;
  }

  // Contact info at bottom
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor);
  doc.text('www.toddssportinggoods.com', margin, pageHeight - margin - 0.05);
  doc.text('(978) 927-1600', pageWidth - margin, pageHeight - margin - 0.05, { align: 'right' });

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

    // Populate client info from individual fields
    body.clientInfo = {
      contactName: body.clientContactName,
      email: body.clientEmail,
      phone: body.clientPhone,
      address: body.clientAddress,
      city: body.clientCity,
      state: body.clientState,
      zip: body.clientZip,
    };

    // Fetch rep info if repId provided
    if (body.repId) {
      const { data: repData } = await supabaseClient
        .from('reps')
        .select('name, email, phone')
        .eq('id', body.repId)
        .single();
      
      if (repData) {
        body.rep = {
          name: repData.name,
          email: repData.email,
          phone: repData.phone,
        };
        console.log('Including rep:', body.rep.name);
      }
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
          client_contact_name: body.clientContactName || null,
          client_email: body.clientEmail || null,
          client_phone: body.clientPhone || null,
          client_address: body.clientAddress || null,
          client_city: body.clientCity || null,
          client_state: body.clientState || null,
          client_zip: body.clientZip || null,
          products: body.products,
          notes_cta: body.notesCta || null,
          rep_id: body.repId || null,
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
          client_contact_name: body.clientContactName || null,
          client_email: body.clientEmail || null,
          client_phone: body.clientPhone || null,
          client_address: body.clientAddress || null,
          client_city: body.clientCity || null,
          client_state: body.clientState || null,
          client_zip: body.clientZip || null,
          products: body.products,
          notes_cta: body.notesCta || null,
          rep_id: body.repId || null,
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
