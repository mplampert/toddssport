const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";
const API_CUSTOMER_KEY = Deno.env.get("CHAMPRO_API_KEY") || "";

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
      const response = await fetch(statusUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
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

      const response = await fetch(`${CHAMPRO_BASE_URL}/api/Order/PlaceOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
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

      const response = await fetch(`${CHAMPRO_BASE_URL}/api/Order/PlaceOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
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
