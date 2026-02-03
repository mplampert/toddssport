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

// Helper to fetch image and convert to base64 data URL
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
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
  const darkColor = '#111827';
  const grayColor = '#6b7280';
  const lightGrayColor = '#e5e7eb';

  // ===== HEADER =====
  let y = margin;

  // Draw border around page
  doc.setDrawColor(redColor);
  doc.setLineWidth(0.03);
  doc.roundedRect(margin - 0.1, margin - 0.1, contentWidth + 0.2, pageHeight - margin * 2 + 0.2, 0.1, 0.1, 'S');

  // Logo on left
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin + 0.1, y, 1.2, 0.5);
    } catch (e) {
      console.log('Could not add logo:', e);
    }
  }

  // Header text on right
  const headerX = pageWidth - margin - 0.1;
  
  if (data.clientName) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor);
    doc.text(data.clientName, headerX, y + 0.2, { align: 'right' });
    y += 0.25;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(redColor);
  doc.text('CUSTOM TEAM APPAREL & PROMOTIONAL PRODUCTS', headerX, y + 0.25, { align: 'right' });

  y += 0.6;

  // Header divider
  doc.setDrawColor(lightGrayColor);
  doc.setLineWidth(0.02);
  doc.line(margin, y, pageWidth - margin, y);
  y += 0.2;

  // ===== PRODUCTS GRID =====
  const productCount = data.products.length;
  const cols = 2;
  const rows = Math.ceil(productCount / cols);
  
  // Calculate available height for products
  const footerHeight = 0.9;
  const availableHeight = pageHeight - y - margin - footerHeight;
  
  const cellWidth = (contentWidth - 0.2) / cols;
  const cellHeight = Math.min(availableHeight / rows, 2.8);
  const cellPadding = 0.1;
  const imageHeight = cellHeight * 0.45;

  // Pre-fetch all product images
  const productImages: (string | null)[] = [];
  for (const product of data.products) {
    if (product.imageUrl) {
      const imgData = await fetchImageAsBase64(product.imageUrl);
      productImages.push(imgData);
    } else {
      productImages.push(null);
    }
  }

  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const cellX = margin + (col * (cellWidth + 0.1));
    const cellY = y + (row * (cellHeight + 0.1));

    // Cell background
    doc.setFillColor('#fafafa');
    doc.setDrawColor(lightGrayColor);
    doc.setLineWidth(0.01);
    doc.roundedRect(cellX, cellY, cellWidth, cellHeight, 0.08, 0.08, 'FD');

    let textY = cellY + cellPadding;

    // Product image
    const imgData = productImages[i];
    if (imgData) {
      try {
        const imgX = cellX + cellPadding;
        const imgWidth = cellWidth - (cellPadding * 2);
        
        // White background for image area
        doc.setFillColor('#ffffff');
        doc.roundedRect(imgX, textY, imgWidth, imageHeight, 0.05, 0.05, 'F');
        
        // Add image centered in container
        const format = getImageFormat(product.imageUrl || '');
        doc.addImage(imgData, format, imgX + 0.1, textY + 0.05, imgWidth - 0.2, imageHeight - 0.1);
      } catch (e) {
        console.log('Could not add product image:', e);
      }
    } else {
      // Placeholder
      doc.setFillColor('#ffffff');
      doc.setDrawColor('#d1d5db');
      doc.setLineWidth(0.01);
      doc.setLineDashPattern([0.05, 0.05], 0);
      doc.roundedRect(cellX + cellPadding, textY, cellWidth - (cellPadding * 2), imageHeight, 0.05, 0.05, 'FD');
      doc.setLineDashPattern([], 0);
      
      doc.setFontSize(8);
      doc.setTextColor('#9ca3af');
      doc.text('No Image', cellX + cellWidth / 2, textY + imageHeight / 2 + 0.05, { align: 'center' });
    }

    textY += imageHeight + 0.15;

    // Product title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor);
    const titleLines = doc.splitTextToSize(product.title, cellWidth - (cellPadding * 2));
    doc.text(titleLines.slice(0, 2), cellX + cellPadding, textY);
    textY += titleLines.slice(0, 2).length * 0.16;

    // Product description
    if (product.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(grayColor);
      const descLines = doc.splitTextToSize(product.description, cellWidth - (cellPadding * 2));
      doc.text(descLines.slice(0, 2), cellX + cellPadding, textY + 0.08);
      textY += descLines.slice(0, 2).length * 0.14;
    }

    // Price line
    if (product.priceLine) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(redColor);
      doc.text(product.priceLine, cellX + cellPadding, cellY + cellHeight - cellPadding - 0.05);
    }
  }

  // ===== FOOTER =====
  const footerY = pageHeight - margin - footerHeight;

  // Footer divider
  doc.setDrawColor(lightGrayColor);
  doc.setLineWidth(0.02);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // CTA box
  if (data.notesCta) {
    doc.setFillColor(redColor);
    doc.roundedRect(margin, footerY + 0.1, contentWidth, 0.4, 0.08, 0.08, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    doc.text(data.notesCta, pageWidth / 2, footerY + 0.35, { align: 'center' });
  }

  // Footer info
  const infoY = data.notesCta ? footerY + 0.65 : footerY + 0.25;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor);
  doc.text("Todd's — Your Partner in Team & Promotional Apparel", margin, infoY);
  doc.text('toddssport.lovable.app | Contact Your Rep Today', pageWidth - margin, infoY, { align: 'right' });

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
