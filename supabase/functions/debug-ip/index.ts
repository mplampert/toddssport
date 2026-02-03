/**
 * GET /api/debug/ip
 * 
 * Makes an HTTP request to an external "what is my IP" service from Lovable Cloud
 * and returns the outbound IP address that the service sees.
 * 
 * HOW TO USE:
 * 1. Deploy this function to Lovable Cloud
 * 2. Visit: https://ookvohtvmjcgrfahigyr.supabase.co/functions/v1/debug-ip
 *    (or call it from your browser console / frontend)
 * 3. Copy the IP address returned
 * 4. Add this IP to Champro's "API Allowed IP Addresses" in your Champro account
 * 5. After adding the IP, your /api/champro/order calls will be accepted
 * 
 * You can also call this from your frontend:
 * 
 *   const response = await supabase.functions.invoke("debug-ip");
 *   console.log("Lovable Cloud outbound IP:", response.data.ip);
 * 
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Try multiple IP lookup services in case one is down
    const ipServices = [
      "https://api.ipify.org?format=text",
      "https://icanhazip.com",
      "https://curlmyip.org",
      "https://checkip.amazonaws.com",
    ];

    let ip: string | null = null;
    let usedService: string | null = null;

    for (const service of ipServices) {
      try {
        console.log(`Trying IP service: ${service}`);
        const response = await fetch(service, {
          headers: { "User-Agent": "Lovable-Cloud-Debug" },
        });
        
        if (response.ok) {
          ip = (await response.text()).trim();
          usedService = service;
          console.log(`Got IP from ${service}: ${ip}`);
          break;
        }
      } catch (e) {
        console.log(`Service ${service} failed:`, e);
        continue;
      }
    }

    if (!ip) {
      return new Response(
        JSON.stringify({
          error: "Could not determine outbound IP from any service",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return both JSON and plain text formats
    const acceptHeader = req.headers.get("accept") || "";
    
    if (acceptHeader.includes("text/plain")) {
      return new Response(ip, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    return new Response(
      JSON.stringify({
        ip,
        service: usedService,
        message: "Add this IP to Champro's 'API Allowed IP Addresses' in your Champro account settings.",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Debug IP error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
