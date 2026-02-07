import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { storeName, primaryColor, secondaryColor, storeType, products } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build product color lists for AI context
    const productDescriptions = products.map((p: any) =>
      `Product "${p.styleName}" (${p.brandName}) - Available colors: ${p.colors.map((c: any) => `${c.name} (${c.code})`).join(", ")}`
    ).join("\n");

    const systemPrompt = `You are a team store color selector assistant. Given a store's team colors and a list of products with available colors, suggest which colors to offer for each product.

RULES:
- Always include colors that match or closely match the team's primary and secondary colors
- Always include neutral colors: Black, White, Grey/Gray, Navy (if available)
- Include colors that complement the team colors
- For spirit wear stores, favor bold team-color options
- Exclude colors that clash with team identity
- Return ONLY the JSON tool call, no other text`;

    const userPrompt = `Store: "${storeName}"
Primary color: ${primaryColor}
Secondary color: ${secondaryColor}
Store type: ${storeType || "team_store"}

Products and their available colors:
${productDescriptions}

Select the best colors for each product to offer in this team store.`;

    console.log(`Suggesting colors for store "${storeName}" with ${products.length} products`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "select_colors",
              description: "Select colors for each product in the team store",
              parameters: {
                type: "object",
                properties: {
                  selections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        styleName: { type: "string", description: "The product style name" },
                        selectedCodes: {
                          type: "array",
                          items: { type: "string" },
                          description: "Array of color codes to include",
                        },
                      },
                      required: ["styleName", "selectedCodes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["selections"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "select_colors" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("AI did not return structured data");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    console.log(`AI suggested colors for ${parsed.selections?.length || 0} products`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-colors error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
