import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  flyerName?: string;
  clientName?: string;
  products: ProductForFlyer[];
  notesCta?: string;
}

function generateProductCell(product: ProductForFlyer): string {
  return `
    <div class="product-cell">
      ${product.imageUrl ? `
        <div class="product-image-container">
          <img src="${product.imageUrl}" alt="${product.title}" class="product-image" />
        </div>
      ` : `
        <div class="product-image-container product-image-placeholder">
          <span>No Image</span>
        </div>
      `}
      <h3 class="product-title">${product.title}</h3>
      ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
      ${product.priceLine ? `<p class="product-price">${product.priceLine}</p>` : ''}
    </div>
  `;
}

function generateFlyerHTML(data: FlyerData, logoUrl: string): string {
  const productCount = data.products.length;
  const gridClass = productCount <= 2 ? 'grid-2' : productCount <= 4 ? 'grid-4' : 'grid-6';
  
  const productsHtml = data.products.map(p => generateProductCell(p)).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      width: 8.5in;
      height: 11in;
      padding: 0.4in;
      background: white;
    }
    .flyer {
      width: 100%;
      height: 100%;
      border: 3px solid #dc2626;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 16px;
    }
    .logo {
      height: 40px;
    }
    .header-text {
      text-align: right;
    }
    .client-name {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 2px;
    }
    .tagline {
      color: #dc2626;
      font-weight: 600;
      font-size: 11px;
    }
    .products-grid {
      flex: 1;
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .grid-2 {
      grid-template-columns: repeat(2, 1fr);
    }
    .grid-4 {
      grid-template-columns: repeat(2, 1fr);
    }
    .grid-6 {
      grid-template-columns: repeat(2, 1fr);
    }
    .product-cell {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      background: #fafafa;
    }
    .product-image-container {
      width: 100%;
      height: ${productCount <= 2 ? '180px' : productCount <= 4 ? '120px' : '90px'};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      background: white;
      border-radius: 6px;
      overflow: hidden;
    }
    .product-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .product-image-placeholder {
      border: 1px dashed #d1d5db;
      color: #9ca3af;
      font-size: 12px;
    }
    .product-title {
      font-size: ${productCount <= 2 ? '16px' : '14px'};
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .product-description {
      font-size: ${productCount <= 2 ? '12px' : '11px'};
      color: #6b7280;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .product-price {
      font-size: ${productCount <= 2 ? '14px' : '12px'};
      font-weight: 700;
      color: #dc2626;
      margin-top: auto;
    }
    .footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 2px solid #e5e7eb;
    }
    .cta {
      background: #dc2626;
      color: white;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .footer-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="header">
      <img src="${logoUrl}" alt="Todd's Logo" class="logo" />
      <div class="header-text">
        ${data.clientName ? `<div class="client-name">${data.clientName}</div>` : ''}
        <div class="tagline">CUSTOM TEAM APPAREL & PROMOTIONAL PRODUCTS</div>
      </div>
    </div>
    
    <div class="products-grid ${gridClass}">
      ${productsHtml}
    </div>
    
    <div class="footer">
      ${data.notesCta ? `<div class="cta">${data.notesCta}</div>` : ''}
      <div class="footer-info">
        <div><strong>Todd's</strong> — Your Partner in Team & Promotional Apparel</div>
        <div>toddssport.lovable.app | Contact Your Rep Today</div>
      </div>
    </div>
  </div>
</body>
</html>`;
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
    console.log('Generating flyer with', body.products?.length || 0, 'products');

    if (!body.products || body.products.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one product is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate HTML
    const logoUrl = 'https://ookvohtvmjcgrfahigyr.supabase.co/storage/v1/object/public/brand-logos/todds-logo.png';
    const html = generateFlyerHTML(body, logoUrl);

    const flyerId = crypto.randomUUID();
    const htmlFileName = `${flyerId}.html`;
    
    // Store HTML file
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const htmlArrayBuffer = await htmlBlob.arrayBuffer();
    const htmlUint8Array = new Uint8Array(htmlArrayBuffer);
    
    const { error: uploadError } = await supabaseClient.storage
      .from('flyers')
      .upload(htmlFileName, htmlUint8Array, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload HTML: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('flyers')
      .getPublicUrl(htmlFileName);

    const htmlUrl = urlData.publicUrl;

    // Insert flyer record
    const { data: flyer, error: insertError } = await supabaseClient
      .from('flyers')
      .insert({
        product_name: body.flyerName || `Flyer - ${body.products.length} products`,
        client_name: body.clientName || null,
        products: body.products,
        notes_cta: body.notesCta || null,
        pdf_url: htmlUrl,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save flyer: ${insertError.message}`);
    }

    console.log('Flyer created:', flyer.id);

    return new Response(
      JSON.stringify({
        success: true,
        flyer,
        downloadUrl: htmlUrl,
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
