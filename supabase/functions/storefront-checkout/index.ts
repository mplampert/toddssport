import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, data?: unknown) =>
  console.log(`[STOREFRONT-CHECKOUT] ${step}${data ? ` – ${JSON.stringify(data)}` : ""}`);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      storeId,
      items,
      billing,       // { name, email, phone, address? }
      recipient,     // { name, email?, phone?, smsOptIn? }
      fulfillment,   // { method, address?, pickupLocationId?, pickupContactName?, pickupContactPhone?, deliveryAddress?, deliveryInstructions? }
      customerNotes,
      promoCode,     // string | undefined
    } = body;

    if (!storeId || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: "storeId and items required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!billing?.email || !billing?.name) {
      return new Response(JSON.stringify({ error: "Billing name and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Checkout started", { storeId, itemCount: items.length });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch store to validate it's open
    const { data: store, error: storeErr } = await supabase
      .from("team_stores")
      .select("id, name, slug, status, flat_rate_shipping")
      .eq("id", storeId)
      .single();

    if (storeErr || !store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side price verification
    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const { data: dbProducts } = await supabase
      .from("team_store_products")
      .select("id, price_override, display_name, catalog_styles(style_name, brand_name, part_number, style_id)")
      .in("id", productIds);

    const productMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

    // Fetch logo placements for all products in this order (for decoration_snapshot)
    const { data: allItemLogos } = await supabase
      .from("team_store_item_logos")
      .select("team_store_item_id, store_logo_id, store_logo_variant_id, position, x, y, scale, rotation, is_primary, role, sort_order, active, variant_color, variant_size, view, store_logos(name, file_url), store_logo_variants(file_url)")
      .in("team_store_item_id", productIds)
      .eq("active", true)
      .order("sort_order");

    // Group logos by product id
    const logosByProduct = new Map<string, any[]>();
    for (const logo of (allItemLogos || [])) {
      const arr = logosByProduct.get(logo.team_store_item_id) || [];
      arr.push(logo);
      logosByProduct.set(logo.team_store_item_id, arr);
    }

    // Build order items with server-verified prices
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      const serverBasePrice = dbProduct ? Number(dbProduct.price_override) || 0 : 0;
      const decoUpcharge = Number(item.decoUpcharge) || 0;
      const persUpcharge = Number(item.persUpcharge) || 0;
      const serverUnitPrice = serverBasePrice + decoUpcharge + persUpcharge;
      const qty = Math.max(1, Math.round(Number(item.quantity)));
      const lineTotal = serverUnitPrice * qty;
      subtotal += lineTotal;

      // Build decoration snapshot from logo placements
      const productLogos = logosByProduct.get(item.productId) || [];
      const decorationSnapshot = productLogos.length > 0 ? {
        views: ["front", "back", "left_sleeve", "right_sleeve"].filter(v => productLogos.some(l => (l.view || "front") === v)).map(view => ({
          view,
          placements: productLogos
            .filter((l: any) => (l.view || "front") === view)
            .filter((l: any) => !l.variant_color || l.variant_color === item.color)
            .map((l: any) => ({
              position: l.position,
              x: l.x,
              y: l.y,
              scale: l.scale,
              rotation: l.rotation ?? 0,
              is_primary: l.is_primary,
              role: l.role || "primary",
              sort_order: l.sort_order ?? 0,
              logo_id: l.store_logo_id,
              logo_variant_id: l.store_logo_variant_id,
              logo_name: l.store_logos?.name,
              logo_url: l.store_logo_variants?.file_url || l.store_logos?.file_url,
            })),
        })),
      } : null;

      const catalogName = dbProduct?.catalog_styles?.style_name || "Product";
      const catalogSku = dbProduct?.catalog_styles?.part_number || dbProduct?.catalog_styles?.style_id?.toString() || null;
      const storeDisplayName = dbProduct?.display_name || null;

      orderItems.push({
        team_store_product_id: item.productId,
        product_name_snapshot: item.productName || storeDisplayName || catalogName,
        catalog_product_name: catalogName,
        catalog_sku: catalogSku,
        store_display_name: storeDisplayName,
        variant_snapshot: {
          color: item.color,
          colorCode: item.colorCode,
          size: item.size,
          sku: item.sku,
          brandName: item.brandName,
          imageUrl: item.imageUrl,
        },
        quantity: qty,
        unit_price: serverUnitPrice,
        line_total: lineTotal,
        personalization_name: item.personalization?.name || null,
        personalization_number: item.personalization?.number || null,
        team_roster_player_id: item.personalization?.rosterPlayerId || null,
        pricing_snapshot: {
          base_price: serverBasePrice,
          deco_upcharge: decoUpcharge,
          pers_upcharge: persUpcharge,
          pers_name_price: item.personalization?.namePrice || 0,
          pers_number_price: item.personalization?.numberPrice || 0,
        },
        decoration_snapshot: decorationSnapshot,
      });
    }

    // ═══ Promo code validation ═══
    let discountTotal = 0;
    let promoSnapshot: any = null;
    let promoCodeId: string | null = null;

    if (promoCode && typeof promoCode === "string" && promoCode.trim()) {
      const code = promoCode.trim().toUpperCase();
      const purchaserEmail = billing.email.trim().toLowerCase();

      // Look up promo code for this store
      const { data: promo, error: promoErr } = await supabase
        .from("team_store_promo_codes")
        .select("*")
        .eq("store_id", storeId)
        .ilike("code", code)
        .eq("active", true)
        .maybeSingle();

      if (promoErr || !promo) {
        return new Response(JSON.stringify({ error: "Invalid promo code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check date range
      const now = new Date();
      if (promo.starts_at && new Date(promo.starts_at) > now) {
        return new Response(JSON.stringify({ error: "Promo code is not yet active" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (promo.ends_at && new Date(promo.ends_at) < now) {
        return new Response(JSON.stringify({ error: "Promo code has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check allowed_emails
      const allowedEmails: string[] = Array.isArray(promo.allowed_emails) ? promo.allowed_emails : [];
      const allowedDomains: string[] = Array.isArray(promo.allowed_email_domains) ? promo.allowed_email_domains : [];

      if (allowedEmails.length > 0) {
        const emailAllowed = allowedEmails.some(
          (e: string) => e.toLowerCase() === purchaserEmail
        );
        if (!emailAllowed) {
          // Also check domains
          const domain = purchaserEmail.split("@")[1];
          const domainAllowed = allowedDomains.length > 0 && allowedDomains.some(
            (d: string) => d.toLowerCase() === domain
          );
          if (!domainAllowed) {
            return new Response(JSON.stringify({ error: "This promo code is not available for your email" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else if (allowedDomains.length > 0) {
        const domain = purchaserEmail.split("@")[1];
        const domainAllowed = allowedDomains.some(
          (d: string) => d.toLowerCase() === domain
        );
        if (!domainAllowed) {
          return new Response(JSON.stringify({ error: "This promo code is not available for your email domain" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Check max total redemptions
      if (promo.max_redemptions_total) {
        const { count } = await supabase
          .from("team_store_promo_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("promo_code_id", promo.id);
        if ((count || 0) >= promo.max_redemptions_total) {
          return new Response(JSON.stringify({ error: "Promo code has reached its maximum number of uses" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Check per-email limit
      const { count: emailCount } = await supabase
        .from("team_store_promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_code_id", promo.id)
        .ilike("purchaser_email", purchaserEmail);

      if ((emailCount || 0) >= promo.max_redemptions_per_email) {
        return new Response(JSON.stringify({ error: "You have already used this promo code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate discount
      if (promo.discount_type === "percent") {
        discountTotal = Math.round(subtotal * (Number(promo.discount_value) / 100) * 100) / 100;
      } else {
        discountTotal = Math.min(Number(promo.discount_value), subtotal);
      }

      promoCodeId = promo.id;
      promoSnapshot = {
        code: promo.code,
        purchaser_email: purchaserEmail,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        discount_amount: discountTotal,
      };

      log("Promo applied", promoSnapshot);
    }

    // Apply shipping based on fulfillment method
    const fulfillmentMethod = fulfillment?.method || "ship";
    const shippingTotal = fulfillmentMethod === "ship" ? (Number(store.flat_rate_shipping) || 0) : 0;

    const total = Math.max(0.5, subtotal - discountTotal + shippingTotal); // Stripe minimum

    // Generate order number
    const orderNumber = `TS-${Date.now().toString(36).toUpperCase()}`;

    // Build snapshots
    const billingSnapshot = {
      name: billing.name,
      email: billing.email,
      phone: billing.phone || null,
      address: billing.address || null,
    };

    const recipientSnapshot = recipient ? {
      name: recipient.name || null,
      email: recipient.email || null,
      phone: recipient.phone || null,
      sms_opt_in: recipient.smsOptIn || false,
    } : null;

    // fulfillmentMethod already extracted above for shipping calc
    const fulfillmentSnapshot = {
      method: fulfillmentMethod,
      ...(fulfillmentMethod === "ship" ? {
        shipping_name: fulfillment?.address?.name || billing.name,
        shipping_address1: fulfillment?.address?.address1 || null,
        shipping_address2: fulfillment?.address?.address2 || null,
        shipping_city: fulfillment?.address?.city || null,
        shipping_state: fulfillment?.address?.state || null,
        shipping_zip: fulfillment?.address?.zip || null,
        shipping_phone: fulfillment?.address?.phone || billing.phone || null,
      } : {}),
      ...(fulfillmentMethod === "pickup" ? {
        pickup_location_id: fulfillment?.pickupLocationId || null,
        pickup_contact_name: fulfillment?.pickupContactName || null,
        pickup_contact_phone: fulfillment?.pickupContactPhone || null,
      } : {}),
      ...(fulfillmentMethod === "local_delivery" ? {
        delivery_address: fulfillment?.deliveryAddress || null,
        delivery_instructions: fulfillment?.deliveryInstructions || null,
      } : {}),
    };

    // Create order draft
    const { data: order, error: orderErr } = await supabase
      .from("team_store_orders")
      .insert({
        store_id: storeId,
        order_number: orderNumber,
        source: "online",
        status: "draft",
        payment_status: "unpaid",
        // Billing (also stored in legacy fields for backward compat)
        customer_name: billing.name,
        customer_email: billing.email,
        customer_phone: billing.phone || null,
        billing_name: billing.name,
        billing_email: billing.email,
        billing_phone: billing.phone || null,
        billing_address: billing.address || null,
        // Recipient
        recipient_name: recipient?.name || null,
        recipient_email: recipient?.email || null,
        recipient_phone: recipient?.phone || null,
        recipient_sms_opt_in: recipient?.smsOptIn || false,
        // Fulfillment
        fulfillment_method: fulfillmentMethod,
        shipping_name: fulfillmentMethod === "ship" ? (fulfillment?.address?.name || billing.name) : null,
        shipping_address1: fulfillmentMethod === "ship" ? (fulfillment?.address?.address1 || null) : null,
        shipping_address2: fulfillmentMethod === "ship" ? (fulfillment?.address?.address2 || null) : null,
        shipping_city: fulfillmentMethod === "ship" ? (fulfillment?.address?.city || null) : null,
        shipping_state: fulfillmentMethod === "ship" ? (fulfillment?.address?.state || null) : null,
        shipping_zip: fulfillmentMethod === "ship" ? (fulfillment?.address?.zip || null) : null,
        pickup_location_id: fulfillmentMethod === "pickup" ? (fulfillment?.pickupLocationId || null) : null,
        pickup_contact_name: fulfillmentMethod === "pickup" ? (fulfillment?.pickupContactName || null) : null,
        pickup_contact_phone: fulfillmentMethod === "pickup" ? (fulfillment?.pickupContactPhone || null) : null,
        delivery_address: fulfillmentMethod === "local_delivery" ? (fulfillment?.deliveryAddress || null) : null,
        delivery_instructions: fulfillmentMethod === "local_delivery" ? (fulfillment?.deliveryInstructions || null) : null,
        // Snapshots
        billing_snapshot: billingSnapshot,
        recipient_snapshot: recipientSnapshot,
        fulfillment_snapshot: fulfillmentSnapshot,
        promo_snapshot: promoSnapshot,
        promo_code_id: promoCodeId,
        // Totals
        customer_notes: customerNotes || null,
        subtotal,
        total,
        tax_total: 0,
        shipping_total: shippingTotal,
        discount_total: discountTotal,
      } as any)
      .select()
      .single();

    if (orderErr || !order) {
      log("Error creating order", { error: orderErr?.message });
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Order draft created", { orderId: order.id, orderNumber, total });

    // Insert order items
    const { error: itemsErr } = await supabase
      .from("team_store_order_items")
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));

    if (itemsErr) {
      log("Error creating order items", { error: itemsErr.message });
    }

    // Claim roster players (lock_on_first_order)
    if (!itemsErr) {
      // Get inserted items to map roster player IDs to order item IDs
      const { data: insertedItems } = await supabase
        .from("team_store_order_items")
        .select("id, team_roster_player_id, team_store_product_id")
        .eq("order_id", order.id);

      const rosterItemIds = (insertedItems || []).filter((i: any) => i.team_roster_player_id);
      if (rosterItemIds.length > 0) {
        // Check which products have lock_on_first_order
        const prodIds = [...new Set(rosterItemIds.map((i: any) => i.team_store_product_id))];
        const { data: lockProducts } = await supabase
          .from("team_store_products")
          .select("id, number_lock_rule")
          .in("id", prodIds)
          .eq("number_lock_rule", "lock_on_first_order");
        const lockProdSet = new Set((lockProducts || []).map((p: any) => p.id));

        for (const item of rosterItemIds) {
          if (lockProdSet.has(item.team_store_product_id)) {
            await supabase
              .from("team_roster_players")
              .update({
                claimed_order_item_id: item.id,
                claimed_at: new Date().toISOString(),
                claimed_by_email: billing.email,
              } as any)
              .eq("id", item.team_roster_player_id)
              .is("claimed_order_item_id", null); // Only claim if not already claimed
          }
        }
        log("Roster players claimed", { count: rosterItemIds.length });
      }
    }

    // Record promo redemption
    if (promoCodeId && promoSnapshot) {
      await supabase.from("team_store_promo_redemptions").insert({
        promo_code_id: promoCodeId,
        order_id: order.id,
        purchaser_email: promoSnapshot.purchaser_email,
        discount_snapshot: discountTotal,
      });
    }

    // Create Stripe PaymentIntent
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
    const amountCents = Math.round(total * 100);

    let customerId: string | undefined;
    if (billing.email) {
      const customers = await stripe.customers.list({ email: billing.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const c = await stripe.customers.create({
          email: billing.email,
          name: billing.name || undefined,
        });
        customerId = c.id;
      }
    }

    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customerId,
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        store_id: storeId,
        source: "team_store_online",
      },
      automatic_payment_methods: { enabled: true },
    });

    // Store PI id on the order
    await supabase
      .from("team_store_orders")
      .update({ payment_intent_id: pi.id } as any)
      .eq("id", order.id);

    log("PaymentIntent created", { piId: pi.id, amount: amountCents });

    return new Response(
      JSON.stringify({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        orderId: order.id,
        orderNumber,
        total,
        discountTotal,
        shippingTotal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    log("Error", { message: err.message });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
