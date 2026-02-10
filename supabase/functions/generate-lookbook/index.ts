import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PromoProductInput {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  lowestPrice: number | null;
}

interface LookbookInput {
  sport: string;
  level: string;
  colors: string;
  budget: string;
  teamName: string;
  includeProducts: boolean;
  promoProducts?: PromoProductInput[];
}

interface CatalogStyle {
  style_id: number;
  style_name: string;
  brand_name: string;
  title: string | null;
  description: string | null;
  base_category: string | null;
  style_image: string | null;
  is_featured: boolean;
}

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

const MAX_STRING_LENGTH = 500;
const MAX_PROMO_PRODUCTS = 20;

// Strip HTML tags from description
function stripHtml(html: string): string {
  return html
    ?.replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check (admin only) ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Input validation ──
    const input: LookbookInput = await req.json();
    const { sport, level, colors, budget, teamName, includeProducts, promoProducts } = input;

    if (!sport || typeof sport !== 'string' || sport.length > MAX_STRING_LENGTH) {
      return new Response(JSON.stringify({ error: 'Valid sport is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!teamName || typeof teamName !== 'string' || teamName.length > MAX_STRING_LENGTH) {
      return new Response(JSON.stringify({ error: 'Valid team name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (level && (typeof level !== 'string' || level.length > MAX_STRING_LENGTH)) {
      return new Response(JSON.stringify({ error: 'Invalid level' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (colors && (typeof colors !== 'string' || colors.length > MAX_STRING_LENGTH)) {
      return new Response(JSON.stringify({ error: 'Invalid colors' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (budget && (typeof budget !== 'string' || budget.length > MAX_STRING_LENGTH)) {
      return new Response(JSON.stringify({ error: 'Invalid budget' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (promoProducts && (!Array.isArray(promoProducts) || promoProducts.length > MAX_PROMO_PRODUCTS)) {
      return new Response(JSON.stringify({ error: `Too many promo products (max ${MAX_PROMO_PRODUCTS})` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let catalogStyles: CatalogStyle[] = [];
    
    if (includeProducts) {
      const { data: styles, error } = await supabase
        .from('catalog_styles')
        .select('style_id, style_name, brand_name, title, description, base_category, style_image, is_featured')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('brand_name')
        .limit(20);

      if (error) {
        console.error('Error fetching styles:', error);
      } else {
        catalogStyles = styles || [];
      }
    }

    // Build promo products context
    const promoContext = promoProducts && promoProducts.length > 0
      ? `\n\nSelected promo products (PRIORITIZE THESE - the customer specifically chose them):\n${promoProducts.map(p => 
          `- ${p.brand || 'Brand'} ${p.name} (ID: ${p.productId}): ${p.category || 'Item'}${p.lowestPrice ? ` - Starting at $${p.lowestPrice.toFixed(2)}` : ''} ${p.description ? `- ${stripHtml(p.description).slice(0, 80)}...` : ''}`
        ).join('\n')}`
      : '';

    const productContext = catalogStyles.length > 0 
      ? `\n\nFeatured products from our catalog (use these when appropriate):\n${catalogStyles.map(s => 
          `- ${s.brand_name} ${s.style_name}: ${s.title || s.base_category || 'Apparel'} - ${stripHtml(s.description || '').slice(0, 100)}...`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are a sports apparel consultant for Todd's Sporting Goods, a premier team sports apparel and uniform company. 
You create professional uniform and spiritswear package recommendations.

Generate 3-5 package options based on the customer's requirements. Each package should be progressively more premium.
${promoContext}
${productContext}

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "packages": [
    {
      "name": "Package Name (e.g., 'Essential Starter', 'Game Day Ready', 'Championship Elite')",
      "tagline": "A catchy 5-10 word tagline",
      "description": "2-3 sentence description of the package",
      "items": [
        {
          "name": "Item name (use real product names from catalog when available)",
          "type": "jersey|shorts|hoodie|tee|hat|bag|uniform-set|warmup|polo|jacket|promo",
          "priceRange": "$XX-$XX per piece",
          "isFromCatalog": true or false,
          "imageUrl": "URL if from selected promo products"
        }
      ],
      "totalRange": "$XXX-$XXX per player",
      "marketingCopy": "A compelling 2-3 sentence sales pitch for this package"
    }
  ],
  "overallIntro": "A 2-3 sentence introduction for the ${teamName} lookbook",
  "closingCTA": "A compelling call-to-action sentence"
}

Guidelines:
- Make package names creative and sports-themed
- Price ranges should align with the budget tier specified
- Include a mix of uniforms and spiritswear items
- Reference team colors naturally in descriptions
- PRIORITIZE selected promo products - include them in packages when relevant
- If promo products have image URLs, include them in the items
- If catalog products are available, reference them by brand and style name
- Mark items as isFromCatalog: true when using real products from the list above
- Make the copy energetic and professional`;

    const userPrompt = `Create a lookbook for:
Team Name: ${teamName}
Sport: ${sport}
Level: ${level || 'Not specified'}
Team Colors: ${colors || 'Not specified'}
Budget Tier: ${budget || 'Not specified'}

${promoProducts && promoProducts.length > 0 ? `IMPORTANT: The customer has specifically selected ${promoProducts.length} promo products. Include these in the packages where appropriate.` : ''}
${catalogStyles.length > 0 ? `We have ${catalogStyles.length} featured products in our catalog. Prioritize using these real products when they fit the sport and package tier. For items not in the catalog, generate appropriate suggestions with estimated prices.` : 'Generate all items with estimated price ranges since no featured catalog products are available.'}`;

    console.log(`Generating lookbook for ${teamName} (${sport})`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate lookbook' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON');
      return new Response(
        JSON.stringify({ error: 'Failed to parse generated content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully generated ${parsed.packages?.length || 0} packages`);

    return new Response(
      JSON.stringify({
        ...parsed,
        teamName,
        sport,
        level,
        colors,
        budget,
        catalogProductsUsed: catalogStyles.length,
        promoProductsUsed: promoProducts?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-lookbook:', error);
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
