import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cart-session, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItemRequest {
  champroSessionId: string;
  sportSlug: string;
  sportTitle?: string;
  quantity?: number;
  leadTime?: string;
  teamName?: string;
  category?: string;
  productMaster?: string;
  unitPrice?: number;
  cartSessionId: string; // Browser session ID for anonymous cart
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: CartItemRequest = await req.json();
    console.log("Cart item request:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.champroSessionId || !body.sportSlug || !body.cartSessionId) {
      console.error("Missing required fields:", {
        champroSessionId: !!body.champroSessionId,
        sportSlug: !!body.sportSlug,
        cartSessionId: !!body.cartSessionId,
      });
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: champroSessionId, sportSlug, and cartSessionId are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is authenticated (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
        console.log("Authenticated user:", userId);
      }
    }

    // Create cart item
    const cartItem = {
      session_id: body.cartSessionId,
      user_id: userId,
      champro_session_id: body.champroSessionId,
      sport_slug: body.sportSlug,
      sport_title: body.sportTitle || null,
      quantity: body.quantity || 12,
      lead_time: body.leadTime || "standard",
      team_name: body.teamName || null,
      category: body.category || null,
      product_master: body.productMaster || null,
      unit_price: body.unitPrice || null,
    };

    console.log("Inserting cart item:", JSON.stringify(cartItem, null, 2));

    const { data, error } = await supabase
      .from("cart_items")
      .insert(cartItem)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create cart item", details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Cart item created:", data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cartItemId: data.id,
        message: "Design added to cart"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing cart item:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
