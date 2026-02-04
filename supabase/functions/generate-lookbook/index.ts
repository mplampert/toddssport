import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LookbookInput {
  sport: string;
  level: string;
  colors: string;
  budget: string;
  teamName: string;
  includeProducts: boolean;
}

interface LookbookProduct {
  id: string;
  name: string;
  sport: string;
  type: string;
  image_url: string | null;
  msrp: number | null;
  description: string | null;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: LookbookInput = await req.json();
    const { sport, level, colors, budget, teamName, includeProducts } = input;

    if (!sport || !teamName) {
      return new Response(
        JSON.stringify({ error: 'Sport and team name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let catalogProducts: LookbookProduct[] = [];
    
    // Fetch products from catalog if requested
    if (includeProducts) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: products, error } = await supabase
        .from('lookbook_products')
        .select('*')
        .eq('sport', sport.toLowerCase())
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        catalogProducts = products || [];
      }
    }

    // Build the AI prompt
    const productContext = catalogProducts.length > 0 
      ? `\n\nAvailable products from our catalog for ${sport}:\n${catalogProducts.map(p => 
          `- ${p.name} (${p.type}): $${p.msrp || 'TBD'} - ${p.description || 'Custom team apparel'}`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are a sports apparel consultant for Todd's Sporting Goods, a premier team sports apparel and uniform company. 
You create professional uniform and spiritswear package recommendations.

Generate 3-5 package options based on the customer's requirements. Each package should be progressively more premium.
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
          "name": "Item name",
          "type": "jersey|shorts|hoodie|tee|hat|bag|uniform-set|warmup",
          "priceRange": "$XX-$XX per piece",
          "isFromCatalog": false
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
- Make the copy energetic and professional`;

    const userPrompt = `Create a lookbook for:
Team Name: ${teamName}
Sport: ${sport}
Level: ${level}
Team Colors: ${colors}
Budget Tier: ${budget}

${catalogProducts.length > 0 ? 'Prioritize using the catalog products listed above when appropriate. Mark those items with isFromCatalog: true and use their actual prices.' : 'Generate all items with estimated price ranges since no catalog products are available for this sport.'}`;

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
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
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
      console.error('No content in AI response:', data);
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: content }),
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
        catalogProductsUsed: catalogProducts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-lookbook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
