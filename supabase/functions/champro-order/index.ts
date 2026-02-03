/**
 * POST /api/champro/order
 * 
 * Accepts: { champroSessionId: string, sportSlug: string }
 * 
 * This endpoint receives a Champro Custom Builder session ID and places an order
 * via the Champro Order API. The session ID contains the full design configuration
 * that was created in the iframe builder.
 * 
 * Environment variables required:
 * - CHAMPRO_API_KEY: Your Champro API Customer Key
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";

interface OrderRequest {
  champroSessionId: string;
  sportSlug: string;
  // Optional additional fields for the order
  shipTo?: {
    firstName: string;
    lastName: string;
    address: string;
    address2?: string;
    city: string;
    stateCode: string;
    zipCode: string;
    countryCode: string;
    phone?: string;
    isResidential?: boolean;
  };
  leadTime?: string;
  teamName?: string;
  po?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const CHAMPRO_API_KEY = Deno.env.get("CHAMPRO_API_KEY");
    if (!CHAMPRO_API_KEY) {
      console.error("CHAMPRO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Champro API key not configured on server" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: OrderRequest = await req.json();
    const { champroSessionId, sportSlug, shipTo, leadTime, teamName, po } = body;

    if (!champroSessionId) {
      return new Response(
        JSON.stringify({ error: "champroSessionId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!sportSlug) {
      return new Response(
        JSON.stringify({ error: "sportSlug is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing Champro order:", {
      champroSessionId,
      sportSlug,
      teamName,
      po,
    });

    // Generate a unique PO if not provided
    const orderPO = po || `WEB-${Date.now()}-${sportSlug.toUpperCase()}`;

    // Build the order request for Champro
    // The sessionId from the Custom Builder contains the design - we reference it via ProofFileURL
    // or through their session-based order API if available
    const orderPayload = {
      APICustomerKey: CHAMPRO_API_KEY,
      Orders: [
        {
          PO: orderPO,
          OrderType: "CUSTOM",
          // Use provided shipping info or placeholder
          ShipToFirstName: shipTo?.firstName || "PENDING",
          ShipToLastName: shipTo?.lastName || "CUSTOMER",
          Address: shipTo?.address || "TBD",
          Address2: shipTo?.address2 || "",
          City: shipTo?.city || "TBD",
          StateCode: shipTo?.stateCode || "IL",
          ZIPCode: shipTo?.zipCode || "00000",
          CountryCode: shipTo?.countryCode || "USA",
          Phone: shipTo?.phone || "",
          IsResidential: shipTo?.isResidential ? 1 : 0,
          LeadTime: leadTime || "JUICE Standard",
          // Reference the Custom Builder session
          // The session ID links to the saved design in Champro's system
          ProofFileURL: `https://cb.champrosports.com/session/${champroSessionId}`,
          TeamColor: "",
          OrderItems: [
            {
              // The session contains the product details - this is a placeholder
              // Champro's system should resolve the actual SKU from the session
              SKU: `SESSION-${champroSessionId}`,
              TeamName: teamName || "",
              PlayerName: "",
              PlayerNumber: "",
              Quantity: 1,
            },
          ],
        },
      ],
    };

    console.log("Sending order to Champro API:", JSON.stringify(orderPayload, null, 2));

    // Call the Champro Order API
    const champroResponse = await fetch(`${CHAMPRO_BASE_URL}/api/Order/PlaceOrder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const champroData = await champroResponse.json();
    console.log("Champro API response:", JSON.stringify(champroData, null, 2));

    // Check for Champro-specific error responses
    if (champroData.Error || champroData.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: champroData.Error || champroData.error,
          champroResponse: champroData,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success with Champro response
    return new Response(
      JSON.stringify({
        success: true,
        orderPO,
        champroSessionId,
        sportSlug,
        champroResponse: champroData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Champro order error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
