const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";
const API_CUSTOMER_KEY = Deno.env.get("CHAMPRO_API_KEY") || "";

// Route requests through Fixie static IP proxy for Champro IP whitelisting
async function fetchViaProxy(
  url: string,
  method: string,
  body?: unknown
): Promise<Response> {
  const proxyUrl = Deno.env.get("FIXIE_PROXY_URL");

  if (proxyUrl) {
    const parsed = new URL(proxyUrl);
    let client: Deno.HttpClient | null = null;
    try {
      client = Deno.createHttpClient({
        proxy: {
          url: `${parsed.protocol}//${parsed.host}`,
          basicAuth: {
            username: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
          },
        },
      });

      return await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        // @ts-ignore - Deno client option for proxy
        client,
      });
    } finally {
      if (client) client.close();
    }
  }

  // Fallback: direct call
  console.warn("No FIXIE_PROXY_URL configured, calling Champro directly");
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    console.log("Champro API called with action:", action);

    if (!API_CUSTOMER_KEY) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "orderStatus") {
      const orderNumber = url.searchParams.get("orderNumber");
      if (!orderNumber) {
        return new Response(
          JSON.stringify({ error: "OrderNumber is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusUrl = `${CHAMPRO_BASE_URL}/api/Order/OrderStatus?OrderNumber=${encodeURIComponent(orderNumber)}&APICustomerKey=${encodeURIComponent(API_CUSTOMER_KEY)}`;
      const response = await fetchViaProxy(statusUrl, "GET");
      const data = await response.json();
      console.log("Order status response:", JSON.stringify(data, null, 2));

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "customOrder") {
      const payload = await req.json();
      const requestBody = {
        APICustomerKey: API_CUSTOMER_KEY,
        Orders: [{
          PO: payload.PO,
          OrderType: "CUSTOM",
          ShipToLastName: payload.ShipToLastName,
          ShipToFirstName: payload.ShipToFirstName,
          Address: payload.Address,
          Address2: payload.Address2 || "",
          City: payload.City,
          StateCode: payload.StateCode,
          ZIPCode: payload.ZIPCode,
          CountryCode: payload.CountryCode,
          Phone: payload.Phone || "",
          IsResidential: payload.IsResidential ? 1 : 0,
          LeadTime: payload.LeadTime || "",
          ProofFileURL: payload.ProofFileURL || "",
          TeamColor: payload.TeamColor || "",
          OrderItems: (payload.OrderItems || []).map((item: Record<string, unknown>) => ({
            SKU: item.SKU,
            TeamName: item.TeamName || "",
            PlayerName: item.PlayerName || "",
            PlayerNumber: item.PlayerNumber || "",
            Quantity: item.Quantity,
          })),
        }],
      };

      const response = await fetchViaProxy(`${CHAMPRO_BASE_URL}/api/Order/PlaceOrder`, "POST", requestBody);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stockOrder") {
      const payload = await req.json();
      const requestBody = {
        APICustomerKey: API_CUSTOMER_KEY,
        Autowarehouse: payload.Autowarehouse ? "YES" : "",
        Orders: [{
          PO: payload.PO,
          OrderType: "STOCK",
          ShipToLastName: payload.ShipToLastName,
          ShipToFirstName: payload.ShipToFirstName,
          Address: payload.Address,
          Address2: payload.Address2 || "",
          City: payload.City,
          StateCode: payload.StateCode,
          ZIPCode: payload.ZIPCode,
          CountryCode: payload.CountryCode,
          Phone: payload.Phone || "",
          ShippingMethod: payload.ShippingMethod || "",
          ShippingCustomerAccount: payload.ShippingCustomerAccount || "",
          IsResidential: payload.IsResidential ? 1 : 0,
          OrderItems: (payload.OrderItems || []).map((item: Record<string, unknown>) => ({
            SKU: item.SKU,
            Warehouse: item.Warehouse || "IL",
            Quantity: item.Quantity,
          })),
        }],
      };

      const response = await fetchViaProxy(`${CHAMPRO_BASE_URL}/api/Order/PlaceOrder`, "POST", requestBody);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: customOrder, stockOrder, or orderStatus" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Champro API error:", error);
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
