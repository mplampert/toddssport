import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GHL_API = "https://services.leadconnectorhq.com";

async function ghlFetch(path: string, apiKey: string, options: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
      ...(options.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`GHL ${path} [${res.status}]: ${body}`);
    throw new Error(`GHL API error ${res.status}`);
  }
  return JSON.parse(body);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GHL_API_KEY");
    const locationId = Deno.env.get("GHL_LOCATION_ID");
    if (!apiKey || !locationId) {
      console.error("Missing GHL_API_KEY or GHL_LOCATION_ID");
      return new Response(JSON.stringify({ error: "GHL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const nameParts = (payload.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 1. Create or update contact
    const contactRes = await ghlFetch("/contacts/upsert", apiKey, {
      method: "POST",
      body: JSON.stringify({
        locationId,
        firstName,
        lastName,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
        companyName: payload.organization || undefined,
        source: "Product Catalog",
        tags: ["catalog-inquiry"],
      }),
    });

    const contactId = contactRes?.contact?.id;
    if (!contactId) {
      console.error("No contact ID returned:", JSON.stringify(contactRes));
      throw new Error("Failed to create GHL contact");
    }

    console.log("GHL contact upserted:", contactId);

    // 2. Get first pipeline
    const pipelinesRes = await ghlFetch(`/opportunities/pipelines?locationId=${locationId}`, apiKey);
    const pipelines = pipelinesRes?.pipelines || [];
    if (pipelines.length === 0) {
      console.error("No pipelines found for location", locationId);
      throw new Error("No GHL pipelines found");
    }
    const pipeline = pipelines[0];
    const pipelineId = pipeline.id;
    const firstStageId = pipeline.stages?.[0]?.id;

    // 3. Build opportunity name
    const oppName = [
      payload.product_brand,
      payload.product_style_code,
      payload.product_name,
    ].filter(Boolean).join(" – ") || "Catalog Inquiry";

    // 4. Create opportunity
    const oppBody: Record<string, unknown> = {
      locationId,
      pipelineId,
      contactId,
      name: oppName,
      source: "Product Catalog",
      status: "open",
    };
    if (firstStageId) oppBody.pipelineStageId = firstStageId;

    const oppRes = await ghlFetch("/opportunities/", apiKey, {
      method: "POST",
      body: JSON.stringify(oppBody),
    });

    console.log("GHL opportunity created:", oppRes?.opportunity?.id);

    // 5. Add a note with full details
    if (oppRes?.opportunity?.id) {
      const noteLines = [
        `**Product:** ${payload.product_name || "N/A"}`,
        `**Brand:** ${payload.product_brand || "N/A"}`,
        `**Style Code:** ${payload.product_style_code || "N/A"}`,
        `**Color:** ${payload.product_color || "N/A"}`,
        `**Quantity:** ${payload.quantity_estimate || "N/A"}`,
        `**Decoration:** ${payload.decoration_type || "N/A"}`,
        `**Notes:** ${payload.notes || "None"}`,
      ].join("\n");

      await ghlFetch(`/contacts/${contactId}/notes`, apiKey, {
        method: "POST",
        body: JSON.stringify({ body: noteLines }),
      }).catch((err) => console.warn("Note creation failed (non-critical):", err));
    }

    return new Response(JSON.stringify({ success: true, contactId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-product-inquiry error:", err);
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
