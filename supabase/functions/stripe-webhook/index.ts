import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

function mapLeadTimeToChampro(leadTime: string): string {
  switch (leadTime) {
    case "standard":
      return "JUICE Standard";
    case "express":
      return "JUICE Express";
    case "express_plus":
      return "JUICE Express Plus";
    default:
      return "JUICE Standard";
  }
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const lastName = parts.pop() || "";
  const firstName = parts.join(" ");
  return { firstName, lastName };
}

// Call Champro API through the Fixie proxy for static IP
async function callChamproViaProxy(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<Response> {
  const fixieProxyUrl = Deno.env.get("FIXIE_PROXY_URL");
  const targetUrl = `${CHAMPRO_BASE_URL}${endpoint}`;

  logStep("Calling Champro API", { endpoint, method, hasProxy: !!fixieProxyUrl });

  if (fixieProxyUrl) {
    // Parse proxy URL to get auth credentials
    // Format: http://user:pass@host:port
    const proxyUrlObj = new URL(fixieProxyUrl);
    const proxyAuth = `${proxyUrlObj.username}:${proxyUrlObj.password}`;
    const proxyHost = proxyUrlObj.hostname;
    const proxyPort = proxyUrlObj.port || "80";

    // Use Deno's native proxy support via CONNECT
    // For HTTPS targets through HTTP proxy, we use the Proxy-Authorization header
    const proxyAuthHeader = btoa(proxyAuth);

    const response = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Proxy-Authorization": `Basic ${proxyAuthHeader}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return response;
  } else {
    // Direct call (for testing or if proxy not configured)
    logStep("WARNING: No proxy configured, making direct API call");
    const response = await fetch(targetUrl, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  }
}

// Send failure notification via the notify-order-failure edge function
async function notifyOrderFailure(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: {
    orderId: string;
    po: string;
    customerEmail?: string;
    errorMessage: string;
    champroResponse?: unknown;
    stripeSessionId?: string;
  }
): Promise<void> {
  try {
    logStep("Sending failure notification", { orderId: payload.orderId });

    const response = await fetch(`${supabaseUrl}/functions/v1/notify-order-failure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      logStep("Failure notification sent successfully");
    } else {
      logStep("Failed to send notification", { status: response.status });
    }
  } catch (error) {
    logStep("Error sending notification", { error: String(error) });
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const champroApiKey = Deno.env.get("CHAMPRO_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response("Stripe not configured", { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Webhook signature verification failed:", errorMessage);
        return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
      }
    } else {
      // For development/testing without signature verification
      console.warn("Webhook signature not verified - STRIPE_WEBHOOK_SECRET not configured");
      event = JSON.parse(body);
    }

    logStep("Received event", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract metadata
      const orderId = session.metadata?.order_id;
      const champroSessionId = session.metadata?.champro_session_id;
      const sportSlug = session.metadata?.sport_slug;
      const productMaster = session.metadata?.product_master;
      const quantity = session.metadata?.quantity;
      const leadTime = session.metadata?.lead_time || "standard";
      const teamName = session.metadata?.team_name;
      const customerName = session.metadata?.customer_name;

      logStep("Checkout completed", {
        orderId,
        champroSessionId,
        sportSlug,
        productMaster,
        quantity,
        leadTime,
        stripeSessionId: session.id,
        paymentStatus: session.payment_status,
      });

      // Get shipping details from Stripe session
      const shipping = session.shipping_details;
      const customerDetails = session.customer_details;

      let shipTo = {
        firstName: "",
        lastName: "",
        address: "",
        address2: "",
        city: "",
        stateCode: "",
        zipCode: "",
        countryCode: "USA",
        phone: "",
        isResidential: true,
      };

      if (shipping?.address) {
        const { firstName, lastName } = splitName(shipping.name || customerName || "");
        shipTo = {
          firstName,
          lastName,
          address: shipping.address.line1 || "",
          address2: shipping.address.line2 || "",
          city: shipping.address.city || "",
          stateCode: shipping.address.state || "",
          zipCode: shipping.address.postal_code || "",
          countryCode: shipping.address.country || "US",
          phone: customerDetails?.phone || "",
          isResidential: true,
        };
      }

      logStep("Shipping details", shipTo);

      // Update order in Supabase
      if (supabaseUrl && supabaseServiceKey && orderId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // First, check if order was already sent to Champro (idempotency check)
        const { data: existingOrder, error: fetchError } = await supabase
          .from("champro_orders")
          .select("id, sent_to_champro, po")
          .eq("id", orderId)
          .single();

        if (fetchError) {
          logStep("Error fetching order", { error: fetchError.message });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (existingOrder?.sent_to_champro) {
          logStep("Order already sent to Champro, skipping", { orderId });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const po = existingOrder?.po || `WEB-${orderId}`;

        // Update order status to paid
        const { data: order, error: updateError } = await supabase
          .from("champro_orders")
          .update({
            status: "paid",
            request_payload: {
              stripe_session_id: session.id,
              sport_slug: sportSlug,
              product_master: productMaster,
              quantity: quantity,
              lead_time: leadTime,
              lead_time_name: mapLeadTimeToChampro(leadTime),
              team_name: teamName,
              customer_name: customerName,
              customer_email: session.customer_email,
              amount_total: session.amount_total,
              payment_status: session.payment_status,
              ship_to: shipTo,
            },
          })
          .eq("id", orderId)
          .select()
          .single();

        if (updateError) {
          logStep("Error updating order to paid", { error: updateError.message });
        } else {
          logStep("Order updated to paid", { orderId: order.id });
        }

        // Call Champro PlaceOrder API if configured
        if (champroApiKey && champroSessionId) {
          logStep("Calling Champro PlaceOrder API via proxy...");

          const champroPayload = {
            APICustomerKey: champroApiKey,
            Orders: [
              {
                PO: po,
                OrderType: "CUSTOM",
                SessionId: champroSessionId,
                ShipToLastName: shipTo.lastName,
                ShipToFirstName: shipTo.firstName,
                Address: shipTo.address,
                Address2: shipTo.address2,
                City: shipTo.city,
                StateCode: shipTo.stateCode,
                ZIPCode: shipTo.zipCode,
                CountryCode: shipTo.countryCode === "US" ? "USA" : shipTo.countryCode,
                Phone: shipTo.phone,
                IsResidential: shipTo.isResidential ? 1 : 0,
                LeadTime: mapLeadTimeToChampro(leadTime),
                ProofFileURL: "",
                TeamColor: "",
                OrderItems: [], // Items come from the SessionId/design
              },
            ],
          };

          logStep("Champro PlaceOrder payload", champroPayload);

          try {
            const champroRes = await callChamproViaProxy(
              "/api/Order/PlaceOrder",
              "POST",
              champroPayload
            );

            const champroData = await champroRes.json();
            logStep("Champro PlaceOrder response", champroData);

            // Check for success - Champro returns OK: "True" or orders with OrderNumber
            const isSuccess = 
              champroData.OK === "True" || 
              champroData.OK === true ||
              (champroData.Orders && champroData.Orders.length > 0 && champroData.Orders[0].OrderNumber);

            if (isSuccess) {
              // Extract order number from response
              const champroOrderNumber = champroData.Orders?.[0]?.OrderNumber || 
                                         champroData.Orders?.[0]?.SalesID ||
                                         null;

              await supabase
                .from("champro_orders")
                .update({
                  status: "submitted_to_champro",
                  response_payload: champroData,
                  sent_to_champro: true,
                  champro_order_number: champroOrderNumber,
                  sub_order_ids: champroData.Orders?.map((o: { OrderNumber?: string; SalesID?: string }) => 
                    o.OrderNumber || o.SalesID
                  ).filter(Boolean) || [],
                })
                .eq("id", orderId);

              logStep("Order submitted to Champro successfully", { champroOrderNumber });
            } else {
              // Champro API call failed - update status and notify
              const errorMessage = champroData.RequestErrors?.[0]?.Response ||
                                   champroData.Orders?.[0]?.OrderErrors?.[0]?.Response ||
                                   champroData.error ||
                                   "Unknown Champro API error";

              await supabase
                .from("champro_orders")
                .update({
                  status: "paid_error_champro",
                  response_payload: champroData,
                  sent_to_champro: false,
                })
                .eq("id", orderId);

              logStep("Champro PlaceOrder failed", { errorMessage, champroData });

              // Send notification
              await notifyOrderFailure(supabaseUrl, supabaseServiceKey, {
                orderId,
                po,
                customerEmail: session.customer_email || undefined,
                errorMessage,
                champroResponse: champroData,
                stripeSessionId: session.id,
              });
            }
          } catch (champroError) {
            const errorMessage = champroError instanceof Error ? champroError.message : String(champroError);
            logStep("Error calling Champro API", { error: errorMessage });
            
            await supabase
              .from("champro_orders")
              .update({
                status: "paid_error_champro",
                response_payload: { error: errorMessage },
                sent_to_champro: false,
              })
              .eq("id", orderId);

            // Send notification
            await notifyOrderFailure(supabaseUrl, supabaseServiceKey, {
              orderId,
              po,
              customerEmail: session.customer_email || undefined,
              errorMessage,
              stripeSessionId: session.id,
            });
          }
        } else {
          logStep("Champro API not configured or no session ID - order ready for manual processing");
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 500 });
  }
});
