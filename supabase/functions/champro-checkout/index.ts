import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment system not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const {
      champroSessionId,
      sportSlug,
      quantity = 1,
      leadTime,
      customerEmail,
      customerName,
      teamName,
    } = await req.json();

    if (!champroSessionId || !sportSlug) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: champroSessionId and sportSlug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating Stripe checkout for Champro design:", {
      champroSessionId,
      sportSlug,
      quantity,
      leadTime,
    });

    // Get the base URL for success/cancel redirects
    const origin = req.headers.get("origin") || "https://toddssport.lovable.app";

    // Create Stripe Checkout Session
    // Note: You'll need to create a product/price in Stripe for custom uniforms
    // For now, we'll use a dynamic price based on the sport
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Custom ${sportSlug.charAt(0).toUpperCase() + sportSlug.slice(1)} Uniform Design`,
              description: `Champro Custom Builder Design (Session: ${champroSessionId})`,
              metadata: {
                champro_session_id: champroSessionId,
                sport_slug: sportSlug,
              },
            },
            // Base price - you may want to adjust this or make it dynamic
            unit_amount: 0, // $0 for now - deposit or final price TBD
          },
          quantity: quantity,
        },
      ],
      customer_email: customerEmail,
      metadata: {
        champro_session_id: champroSessionId,
        sport_slug: sportSlug,
        lead_time: leadTime || "",
        team_name: teamName || "",
        customer_name: customerName || "",
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/uniforms/${sportSlug}`,
    });

    console.log("Stripe checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Champro checkout error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage || "Failed to create checkout session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
