import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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
      const champroSessionId = session.metadata?.champro_session_id;
      const sportSlug = session.metadata?.sport_slug;
      const leadTime = session.metadata?.lead_time;
      const teamName = session.metadata?.team_name;
      const customerName = session.metadata?.customer_name;

      console.log("Checkout completed for Champro design:", {
        champroSessionId,
        sportSlug,
        stripeSessionId: session.id,
        paymentStatus: session.payment_status,
      });

      // Create order record in Supabase if available
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Store as a champro_orders record
        const { data: order, error: orderError } = await supabase
          .from("champro_orders")
          .insert({
            order_type: "CUSTOM",
            po: `STRIPE-${session.id.slice(-8).toUpperCase()}`,
            session_id: champroSessionId,
            status: "paid",
            request_payload: {
              stripe_session_id: session.id,
              sport_slug: sportSlug,
              lead_time: leadTime,
              team_name: teamName,
              customer_name: customerName,
              customer_email: session.customer_email,
              amount_total: session.amount_total,
              payment_status: session.payment_status,
            },
          })
          .select()
          .single();

        if (orderError) {
          console.error("Error creating order record:", orderError);
        } else {
          console.log("Order record created:", order.id);
        }
      }

      // Call Champro PlaceOrder API if configured
      // Note: This requires additional shipping/order details to be collected
      // For now, we'll log and let staff process manually via admin panel
      if (champroApiKey && champroSessionId) {
        console.log("Champro order ready for processing:", {
          champroSessionId,
          sportSlug,
          // Staff can use the admin panel to complete the order with shipping details
        });

        // TODO: Implement full Champro PlaceOrder when shipping details are collected
        // const champroPayload = {
        //   APICustomerKey: champroApiKey,
        //   Orders: [{
        //     PO: `STRIPE-${session.id.slice(-8).toUpperCase()}`,
        //     OrderType: "CUSTOM",
        //     SessionId: champroSessionId,
        //     ...shippingDetails
        //   }]
        // };
        // const champroRes = await fetch("https://api.champrosports.com/api/Order/PlaceOrder", {...});
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
