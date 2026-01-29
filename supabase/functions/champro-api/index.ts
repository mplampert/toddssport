import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Champro API configuration
const CHAMPRO_BASE_URL = "https://api.champrosports.com";
const API_CUSTOMER_KEY = Deno.env.get("CHAMPRO_API_KEY") || "";

interface CustomOrderItem {
  SKU: string;
  TeamName?: string;
  PlayerName?: string;
  PlayerNumber?: string;
  Quantity: number;
}

interface CustomOrderPayload {
  PO: string;
  ShipToFirstName: string;
  ShipToLastName: string;
  Address: string;
  Address2?: string;
  City: string;
  StateCode: string;
  ZIPCode: string;
  CountryCode: string;
  Phone?: string;
  IsResidential?: boolean;
  LeadTime?: string;
  ProofFileURL?: string;
  TeamColor?: string;
  Items: CustomOrderItem[];
}

interface StockOrderItem {
  SKU: string;
  Warehouse: string;
  Quantity: number;
}

interface StockOrderPayload {
  PO: string;
  ShipToFirstName: string;
  ShipToLastName: string;
  Address: string;
  Address2?: string;
  City: string;
  StateCode: string;
  ZIPCode: string;
  CountryCode: string;
  Phone?: string;
  IsResidential?: boolean;
  Autowarehouse?: boolean;
  ShippingMethod?: string;
  ShippingCustomerAccount?: string;
  Items: StockOrderItem[];
}

interface OrderStatusParams {
  SubOrderID: string;
}

// Place Custom Product Order
async function placeCustomOrder(payload: CustomOrderPayload) {
  console.log("Placing custom order with PO:", payload.PO);
  
  const requestBody = {
    APICustomerKey: API_CUSTOMER_KEY,
    PO: payload.PO,
    ShipToFirstName: payload.ShipToFirstName,
    ShipToLastName: payload.ShipToLastName,
    Address: payload.Address,
    Address2: payload.Address2 || "",
    City: payload.City,
    StateCode: payload.StateCode,
    ZIPCode: payload.ZIPCode,
    CountryCode: payload.CountryCode,
    Phone: payload.Phone || "",
    IsResidential: payload.IsResidential ? "YES" : "",
    LeadTime: payload.LeadTime || "",
    ProofFileURL: payload.ProofFileURL || "",
    TeamColor: payload.TeamColor || "",
    SubOrders: payload.Items.map((item) => ({
      SKU: item.SKU,
      TeamName: item.TeamName || "",
      PlayerName: item.PlayerName || "",
      PlayerNumber: item.PlayerNumber || "",
      Quantity: item.Quantity,
    })),
  };

  console.log("Custom order request body:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${CHAMPRO_BASE_URL}/api/CustomProductOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log("Custom order response:", JSON.stringify(data, null, 2));
  
  return data;
}

// Place Stock Product Order
async function placeStockOrder(payload: StockOrderPayload) {
  console.log("Placing stock order with PO:", payload.PO);
  
  const requestBody = {
    APICustomerKey: API_CUSTOMER_KEY,
    PO: payload.PO,
    ShipToFirstName: payload.ShipToFirstName,
    ShipToLastName: payload.ShipToLastName,
    Address: payload.Address,
    Address2: payload.Address2 || "",
    City: payload.City,
    StateCode: payload.StateCode,
    ZIPCode: payload.ZIPCode,
    CountryCode: payload.CountryCode,
    Phone: payload.Phone || "",
    IsResidential: payload.IsResidential ? "YES" : "",
    Autowarehouse: payload.Autowarehouse ? "YES" : "",
    ShippingMethod: payload.ShippingMethod || "",
    ShippingCustomerAccount: payload.ShippingCustomerAccount || "",
    Items: payload.Items.map((item) => ({
      SKU: item.SKU,
      Warehouse: item.Warehouse,
      Quantity: item.Quantity,
    })),
  };

  console.log("Stock order request body:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${CHAMPRO_BASE_URL}/api/StockProductOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log("Stock order response:", JSON.stringify(data, null, 2));
  
  return data;
}

// Get Order Status
async function getOrderStatus(params: OrderStatusParams) {
  console.log("Getting order status for SubOrderID:", params.SubOrderID);
  
  const url = new URL(`${CHAMPRO_BASE_URL}/api/OrderStatus`);
  url.searchParams.append("APICustomerKey", API_CUSTOMER_KEY);
  url.searchParams.append("OrderNumber", params.SubOrderID);

  console.log("Order status URL:", url.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Order status response:", JSON.stringify(data, null, 2));
  
  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    console.log("Champro API called with action:", action);

    if (!API_CUSTOMER_KEY) {
      console.error("CHAMPRO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Champro API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;

    switch (action) {
      case "customOrder": {
        const payload = await req.json();
        result = await placeCustomOrder(payload);
        break;
      }
      case "stockOrder": {
        const payload = await req.json();
        result = await placeStockOrder(payload);
        break;
      }
      case "orderStatus": {
        const subOrderId = url.searchParams.get("subOrderId");
        if (!subOrderId) {
          return new Response(
            JSON.stringify({ error: "SubOrderID is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await getOrderStatus({ SubOrderID: subOrderId });
        break;
      }
      default:
        return new Response(
          JSON.stringify({
            error: "Invalid action. Use: customOrder, stockOrder, or orderStatus",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Champro API error:", error);
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
