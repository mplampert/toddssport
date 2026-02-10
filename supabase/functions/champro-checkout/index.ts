import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LeadTimeType = "standard" | "express" | "express_plus";

interface Wholesale {
  baseCost: number;
}

interface GlobalPricing {
  markupPercent: number;
  rushPercent: number;
}

function calculatePerUnit(
  wholesale: Wholesale,
  pricing: GlobalPricing,
  leadTime: LeadTimeType
): number {
  const baseRetail = wholesale.baseCost * (1 + pricing.markupPercent / 100);

  if (leadTime === "standard") {
    return baseRetail;
  }

  // express / express_plus share same global rushPercent
  const rushMultiplier = 1 + pricing.rushPercent / 100;
  return baseRetail * rushMultiplier;
}

function calculateOrderTotal(
  quantity: number,
  wholesale: Wholesale,
  pricing: GlobalPricing,
  leadTime: LeadTimeType
): number {
  return calculatePerUnit(wholesale, pricing, leadTime) * quantity;
}

function mapLeadTimeToChampro(leadTime: LeadTimeType): string {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment system not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase not configured");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get the user from the auth header (optional - guest checkout allowed)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    const {
      champroSessionId,
      sportSlug,
      category,        // Optional: "JERSEYS" | "TSHIRTS" | "PANTS" | "OUTERWEAR"
      skuCode,         // Optional: exact Champro SKU string
      productMaster,   // Optional: fallback to productMaster lookup
      quantity = 1,
      leadTime = "standard",
      customerEmail,
      customerName,
      teamName,
    } = await req.json();

    console.log("Checkout request:", {
      champroSessionId,
      sportSlug,
      category,
      skuCode,
      productMaster,
      quantity,
      leadTime,
    });

    // Validate required fields
    if (!champroSessionId || !sportSlug) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: champroSessionId and sportSlug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up sellable products only (type="product", not categories)
    let productQuery = supabase.from("champro_products").select("*").eq("type", "product");

    if (skuCode) {
      // Exact SKU lookup
      productQuery = productQuery.eq("sku", skuCode);
    } else if (productMaster) {
      // ProductMaster lookup
      productQuery = productQuery.eq("product_master", productMaster);
    } else if (category) {
      // Sport + category lookup - get first sellable product
      productQuery = productQuery.eq("sport", sportSlug).eq("category", category).limit(1);
    } else {
      // Fallback: get first sellable product for this sport
      productQuery = productQuery.eq("sport", sportSlug).limit(1);
    }

    const { data: products, error: productError } = await productQuery;

    if (productError || !products || products.length === 0) {
      console.error("Product lookup error:", productError);
      return new Response(
        JSON.stringify({ error: "Product not found for this sport/category" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const product = products[0];
    console.log("Found product:", product);

    // Enforce MOQ
    if (quantity < product.moq_custom) {
      return new Response(
        JSON.stringify({ 
          error: `Minimum order quantity is ${product.moq_custom} units`,
          moq: product.moq_custom
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get wholesale pricing for this SKU
    const { data: wholesale, error: wholesaleError } = await supabase
      .from("champro_wholesale")
      .select("*")
      .eq("champro_product_id", product.id)
      .maybeSingle();

    if (wholesaleError || !wholesale) {
      console.error("Wholesale pricing not found:", wholesaleError);
      return new Response(
        JSON.stringify({ error: "Pricing not configured for this SKU. Please set a base cost in Champro Pricing admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get global pricing settings
    const { data: globalSettings, error: globalError } = await supabase
      .from("champro_pricing_settings")
      .select("*")
      .eq("scope", "global")
      .maybeSingle();

    if (globalError || !globalSettings) {
      console.error("Global pricing settings not found:", globalError);
      return new Response(
        JSON.stringify({ error: "Global pricing settings not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build pricing objects
    const wholesaleData: Wholesale = {
      baseCost: Number(wholesale.base_cost),
    };

    const globalPricing: GlobalPricing = {
      markupPercent: Number(globalSettings.markup_percent),
      rushPercent: Number(globalSettings.rush_percent),
    };

    // Calculate total
    const totalAmount = calculateOrderTotal(
      quantity,
      wholesaleData,
      globalPricing,
      leadTime as LeadTimeType
    );

    const perUnitPrice = calculatePerUnit(
      wholesaleData,
      globalPricing,
      leadTime as LeadTimeType
    );

    console.log("Calculated pricing:", {
      totalAmount,
      perUnitPrice,
      quantity,
      leadTime,
      baseCost: wholesaleData.baseCost,
      markup: globalPricing.markupPercent,
      rushPercent: globalPricing.rushPercent,
    });

    // Create pending order in champro_orders
    const { data: order, error: orderError } = await supabase
      .from("champro_orders")
      .insert({
        order_type: "CUSTOM",
        po: `WEB-${Date.now()}`,
        session_id: champroSessionId,
        status: "pending_payment",
        user_id: userId,
        customer_email: customerEmail || null,
        request_payload: {
          champro_session_id: champroSessionId,
          sport_slug: sportSlug,
          category: category || product.category,
          sku: product.sku || product.product_master,
          product_master: product.product_master,
          quantity,
          lead_time: leadTime,
          lead_time_name: mapLeadTimeToChampro(leadTime as LeadTimeType),
          team_name: teamName || "",
          customer_name: customerName || "",
          customer_email: customerEmail || "",
          per_unit_price: perUnitPrice,
          total_amount: totalAmount,
        },
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created order:", order.id);

    // Get the base URL for success/cancel redirects
    const origin = req.headers.get("origin") || "https://toddssport.lovable.app";

    // Calculate amounts in cents
    const unitAmountCents = Math.round(perUnitPrice * 100);

    // Build product description
    const categoryDisplay = category || product.category;
    const leadTimeDisplay = leadTime === "standard" ? "Standard" : leadTime === "express" ? "10-Day Rush" : "5-Day Rush";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Custom ${product.name}`,
              description: `${quantity} units - ${categoryDisplay} - ${leadTimeDisplay} Production`,
              metadata: {
                provider: "champro",
                product_master: product.product_master,
                sku: product.sku || "",
                category: categoryDisplay,
                champro_session_id: champroSessionId,
              },
            },
            unit_amount: unitAmountCents,
          },
          quantity: quantity,
        },
      ],
      // Collect shipping address
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: "Standard Shipping (Included)",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 2500, currency: "usd" },
            display_name: "Express Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 2 },
              maximum: { unit: "business_day", value: 3 },
            },
          },
        },
      ],
      customer_email: customerEmail || undefined,
      metadata: {
        order_id: order.id,
        champro_session_id: champroSessionId,
        product_master: product.product_master,
        sku: product.sku || "",
        category: categoryDisplay,
        sport_slug: sportSlug,
        quantity: quantity.toString(),
        lead_time: leadTime,
        team_name: teamName || "",
        customer_name: customerName || "",
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/uniforms/${sportSlug}`,
    });

    console.log("Stripe checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id, orderId: order.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Champro checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create checkout session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
