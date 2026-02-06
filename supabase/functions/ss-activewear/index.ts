import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SS_BASE = "https://api.ssactivewear.com/v2";
const SS_MEDIA_BASE = "https://www.ssactivewear.com/";

/** Prefix relative image paths with the S&S media base URL */
function resolveImages(data: unknown): unknown {
  const imageFields = [
    "styleImage", "brandImage", "colorFrontImage", "colorSideImage",
    "colorBackImage", "colorDirectSideImage", "colorOnModelFrontImage",
    "colorOnModelBackImage", "colorOnModelSideImage", "colorSwatchImage", "image",
  ];
  if (Array.isArray(data)) return data.map((item) => resolveImages(item));
  if (data && typeof data === "object") {
    const obj = { ...(data as Record<string, unknown>) };
    for (const field of imageFields) {
      const val = obj[field];
      if (typeof val === "string" && val.length > 0 && !val.startsWith("http")) {
        obj[field] = `${SS_MEDIA_BASE}${val}`;
      }
    }
    return obj;
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const account = Deno.env.get("SS_ACTIVEWEAR_ACCOUNT");
    const apiKey = Deno.env.get("SS_ACTIVEWEAR_API_KEY");
    if (!account || !apiKey) {
      console.error("Missing SS Activewear credentials");
      return new Response(
        JSON.stringify({ error: "S&S credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { endpoint, params } = await req.json();
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build URL with query params
    const url = new URL(`${SS_BASE}/${endpoint}`);
    if (params && typeof params === "object") {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    console.log(`SS Activewear API call: ${url.toString()}`);

    const basicAuth = btoa(`${account}:${apiKey}`);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    });

    const rateLimitRemaining = response.headers.get("X-Rate-Limit-Remaining");
    console.log(`SS API response: ${response.status}, rate limit remaining: ${rateLimitRemaining}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SS API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `S&S API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const resolved = resolveImages(data);

    return new Response(JSON.stringify(resolved), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Rate-Limit-Remaining": rateLimitRemaining || "unknown",
      },
    });
  } catch (err) {
    console.error("SS Activewear proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
