/**
 * POST /api/champro/order
 * 
 * Accepts: { champroSessionId: string, sportSlug: string }
 * 
 * This endpoint receives a Champro Custom Builder session ID and places an order
 * via the Champro Order API. The session ID contains the full design configuration
 * that was created in the iframe builder.
 *
 * Requires admin authentication.
 */

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";

interface OrderRequest {
  champroSessionId: string;
  sportSlug: string;
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

const MAX_STRING = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── Auth check (admin only) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const CHAMPRO_API_KEY = Deno.env.get("CHAMPRO_API_KEY");
    if (!CHAMPRO_API_KEY) {
      console.error("CHAMPRO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: OrderRequest = await req.json();
    const { champroSessionId, sportSlug, shipTo, leadTime, teamName, po } = body;

    // ── Input validation ──
    if (!champroSessionId || typeof champroSessionId !== 'string' || champroSessionId.length > MAX_STRING) {
      return new Response(
        JSON.stringify({ error: "Valid champroSessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sportSlug || typeof sportSlug !== 'string' || sportSlug.length > 100) {
      return new Response(
        JSON.stringify({ error: "Valid sportSlug is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (teamName && (typeof teamName !== 'string' || teamName.length > MAX_STRING)) {
      return new Response(
        JSON.stringify({ error: "Invalid team name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (po && (typeof po !== 'string' || po.length > 100)) {
      return new Response(
        JSON.stringify({ error: "Invalid PO" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing Champro order:", { champroSessionId, sportSlug, teamName, po });

    const orderPO = po || `WEB-${Date.now()}-${sportSlug.toUpperCase().slice(0, 20)}`;

    const orderPayload = {
      APICustomerKey: CHAMPRO_API_KEY,
      Orders: [
        {
          PO: orderPO,
          OrderType: "CUSTOM",
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
          ProofFileURL: `https://cb.champrosports.com/session/${champroSessionId}`,
          TeamColor: "",
          OrderItems: [
            {
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

    console.log("Sending order to Champro API");

    const champroResponse = await fetch(`${CHAMPRO_BASE_URL}/api/Order/PlaceOrder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const champroData = await champroResponse.json();
    console.log("Champro API response received");

    if (champroData.Error || champroData.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Order placement failed. Please check the details and try again.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderPO,
        champroSessionId,
        sportSlug,
        champroResponse: champroData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Champro order error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Service temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
