import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const CHAMPRO_BASE_URL = "https://api.champrosports.com";

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

serve(async (req) => {
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

    console.log("Received Stripe webhook event:", event.type);

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

      console.log("Checkout completed:", {
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

      console.log("Shipping details:", shipTo);

      // Update order in Supabase
      if (supabaseUrl && supabaseServiceKey && orderId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
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
          console.error("Error updating order:", updateError);
        } else {
          console.log("Order updated to paid:", order.id);
        }

        // Call Champro PlaceOrder API if configured
        if (champroApiKey && champroSessionId) {
          console.log("Calling Champro PlaceOrder API...");

          const champroPayload = {
            APICustomerKey: champroApiKey,
            Orders: [
              {
                PO: order?.po || `WEB-${orderId}`,
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

          console.log("Champro PlaceOrder payload:", JSON.stringify(champroPayload, null, 2));

          try {
            const champroRes = await fetch(`${CHAMPRO_BASE_URL}/api/Order/PlaceOrder`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(champroPayload),
            });

            const champroData = await champroRes.json();
            console.log("Champro PlaceOrder response:", JSON.stringify(champroData, null, 2));

            // Update order with Champro response
            if (champroData.OK === "True" || champroData.OK === true) {
              await supabase
                .from("champro_orders")
                .update({
                  status: "submitted_to_champro",
                  response_payload: champroData,
                  sub_order_ids: champroData.Orders?.map((o: { OrderNumber: string }) => o.OrderNumber) || [],
                })
                .eq("id", orderId);

              console.log("Order submitted to Champro successfully");
            } else {
              await supabase
                .from("champro_orders")
                .update({
                  status: "paid_error_champro",
                  response_payload: champroData,
                })
                .eq("id", orderId);

              console.error("Champro PlaceOrder failed:", champroData);
            }
          } catch (champroError) {
            console.error("Error calling Champro API:", champroError);
            
            await supabase
              .from("champro_orders")
              .update({
                status: "paid_error_champro",
                response_payload: { error: String(champroError) },
              })
              .eq("id", orderId);
          }
        } else {
          console.log("Champro API not configured or no session ID - order ready for manual processing");
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
