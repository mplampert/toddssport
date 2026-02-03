import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlyerData {
  productName: string;
  subtitle?: string;
  bulletPoints?: string[];
  priceLine?: string;
  fundraisingLine?: string;
  imageUrl?: string;
  notesCta?: string;
}

function generateFlyerHTML(data: FlyerData, logoUrl: string): string {
  const bulletPointsHtml = data.bulletPoints
    ?.filter(bp => bp.trim())
    .map(bp => `<li style="margin-bottom: 8px; font-size: 14px; color: #374151;">${bp}</li>`)
    .join('') || '';

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
      padding: 0.5in;
      background: white;
    }
    .flyer {
      width: 100%;
      height: 100%;
      border: 3px solid #dc2626;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 20px;
    }
    .logo {
      height: 50px;
    }
    .header-text {
      text-align: right;
      color: #dc2626;
      font-weight: 700;
      font-size: 14px;
    }
    .content {
      flex: 1;
      display: flex;
      gap: 24px;
    }
    .image-section {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .product-image {
      max-width: 100%;
      max-height: 350px;
      object-fit: contain;
      border-radius: 8px;
    }
    .details-section {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .product-name {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    .bullets {
      list-style: none;
      padding: 0;
      margin-bottom: 24px;
    }
    .bullets li::before {
      content: "✓ ";
      color: #16a34a;
      font-weight: 700;
    }
    .pricing-section {
      background: #fef2f2;
      border: 2px solid #dc2626;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .price-line {
      font-size: 24px;
      font-weight: 700;
      color: #dc2626;
    }
    .fundraising {
      background: #f0fdf4;
      border: 2px solid #16a34a;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .fundraising-text {
      font-size: 14px;
      font-weight: 600;
      color: #16a34a;
    }
    .cta {
      margin-top: auto;
      background: #dc2626;
      color: white;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      font-weight: 700;
      font-size: 16px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 2px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #6b7280;
    }
    .contact {
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="header">
      <img src="${logoUrl}" alt="Todd's Logo" class="logo" />
      <div class="header-text">
        CUSTOM TEAM APPAREL<br/>
        & PROMOTIONAL PRODUCTS
      </div>
    </div>
    
    <div class="content">
      ${data.imageUrl ? `
      <div class="image-section">
        <img src="${data.imageUrl}" alt="${data.productName}" class="product-image" />
      </div>
      ` : ''}
      
      <div class="details-section" style="${data.imageUrl ? '' : 'flex: 1;'}">
        <h1 class="product-name">${data.productName}</h1>
        ${data.subtitle ? `<p class="subtitle">${data.subtitle}</p>` : ''}
        
        ${bulletPointsHtml ? `<ul class="bullets">${bulletPointsHtml}</ul>` : ''}
        
        ${data.priceLine ? `
        <div class="pricing-section">
          <p class="price-line">${data.priceLine}</p>
        </div>
        ` : ''}
        
        ${data.fundraisingLine ? `
        <div class="fundraising">
          <p class="fundraising-text">🎉 ${data.fundraisingLine}</p>
        </div>
        ` : ''}
        
        ${data.notesCta ? `
        <div class="cta">
          ${data.notesCta}
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="footer">
      <div>
        <strong>Todd's</strong> — Your Partner in Team & Promotional Apparel
      </div>
      <div class="contact">
        toddssport.lovable.app | Contact Your Rep Today
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
    console.log('Generating flyer for:', body.productName);

    // Generate HTML
    const logoUrl = 'https://ookvohtvmjcgrfahigyr.supabase.co/storage/v1/object/public/brand-logos/todds-logo.png';
    const html = generateFlyerHTML(body, logoUrl);

    // Use an HTML to PDF API service
    // For now, we'll store the HTML and use client-side PDF generation
    // This approach works without external API keys
    
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
        product_name: body.productName,
        subtitle: body.subtitle || null,
        bullet_points: body.bulletPoints || [],
        price_line: body.priceLine || null,
        fundraising_line: body.fundraisingLine || null,
        image_url: body.imageUrl || null,
        notes_cta: body.notesCta || null,
        pdf_url: htmlUrl, // We store HTML URL, client converts to PDF
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
