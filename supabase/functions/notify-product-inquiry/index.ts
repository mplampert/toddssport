import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("GHL_INQUIRY_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("GHL_INQUIRY_WEBHOOK_URL not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();

    // POST to GHL webhook
    const ghlResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Map to common GHL contact fields
        firstName: payload.name?.split(" ")[0] || "",
        lastName: payload.name?.split(" ").slice(1).join(" ") || "",
        email: payload.email || "",
        phone: payload.phone || "",
        companyName: payload.organization || "",
        // Custom fields / notes
        source: "Product Catalog Inquiry",
        customField: {
          product_name: payload.product_name || "",
          product_brand: payload.product_brand || "",
          product_style_code: payload.product_style_code || "",
          product_color: payload.product_color || "",
          quantity_estimate: payload.quantity_estimate || "",
          decoration_type: payload.decoration_type || "",
          notes: payload.notes || "",
        },
      }),
    });

    if (!ghlResponse.ok) {
      const body = await ghlResponse.text();
      console.error(`GHL webhook failed [${ghlResponse.status}]: ${body}`);
      return new Response(
        JSON.stringify({ error: "GHL webhook failed", status: ghlResponse.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await ghlResponse.text(); // consume body

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-product-inquiry error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
