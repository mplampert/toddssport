import { createClient } from "@supabase/supabase-js";
import { Resend } from "npm:resend@4.0.0";
import Twilio from "npm:twilio@5.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPT_OUT_KEYWORDS = [
  "stop", "cancel", "end", "quit", "unsubscribe", "stopall", "optout", "revoke",
];

interface SendRequest {
  order_id: string;
  template_key: string;
  variables?: Record<string, string>;
  force_channel?: "email" | "sms";
}

function renderTemplate(body: string, vars: Record<string, string>): string {
  let rendered = body;
  for (const [k, v] of Object.entries(vars)) {
    rendered = rendered.replaceAll(`{{${k}}}`, v || "");
  }
  return rendered;
}

/**
 * Select the best phone number for SMS based on fulfillment type and opt-out status.
 */
async function selectSmsPhone(
  supabase: any,
  order: any,
): Promise<{ phone: string; reason: string } | null> {
  const fulfillment = order.fulfillment_method || "ship";

  // Admin override
  if (order.preferred_sms_phone) {
    const opted = await isPhoneOptedOut(supabase, order.preferred_sms_phone);
    if (!opted) return { phone: order.preferred_sms_phone, reason: "admin_override" };
  }

  // Build priority list based on fulfillment type
  const candidates: { phone: string; reason: string }[] = [];

  const recipientSnapshot = order.recipient_snapshot as any;
  const billingSnapshot = order.billing_snapshot as any;
  const fulfillmentSnapshot = order.fulfillment_snapshot as any;

  if (fulfillment === "pickup" || fulfillment === "local_delivery") {
    if (recipientSnapshot?.phone) candidates.push({ phone: recipientSnapshot.phone, reason: "recipient_phone_pickup" });
    if (order.customer_phone) candidates.push({ phone: order.customer_phone, reason: "billing_phone_fallback" });
  } else {
    // ship
    if (fulfillmentSnapshot?.shipping_phone) candidates.push({ phone: fulfillmentSnapshot.shipping_phone, reason: "shipping_contact_phone" });
    if (recipientSnapshot?.phone) candidates.push({ phone: recipientSnapshot.phone, reason: "recipient_phone_fallback" });
    if (order.customer_phone) candidates.push({ phone: order.customer_phone, reason: "billing_phone_fallback" });
  }

  for (const c of candidates) {
    const opted = await isPhoneOptedOut(supabase, c.phone);
    if (!opted) return c;
  }

  return null;
}

async function isPhoneOptedOut(supabase: any, phone: string): Promise<boolean> {
  const normalized = phone.replace(/\D/g, "");
  const { data } = await supabase
    .from("customer_channels")
    .select("sms_opted_out")
    .or(`phone.eq.${phone},phone.eq.+${normalized},phone.eq.+1${normalized}`)
    .eq("sms_opted_out", true)
    .limit(1);
  return (data && data.length > 0);
}

async function getOrCreateCustomer(supabase: any, email: string, name: string, phone?: string) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({ name, email: email.toLowerCase(), phone })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create customer", error);
    return null;
  }

  // Create channel record
  await supabase.from("customer_channels").insert({
    customer_id: created.id,
    email: email.toLowerCase(),
    phone: phone || null,
    sms_enabled_transactional: !!phone,
  });

  return created.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendRequest = await req.json();
    const { order_id, template_key, variables = {}, force_channel } = body;

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("team_store_orders")
      .select("*, team_stores(name)")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create customer
    const customerId = await getOrCreateCustomer(
      supabase,
      order.customer_email,
      order.customer_name || "Customer",
      order.customer_phone
    );

    // Fetch settings
    const { data: settings } = await supabase
      .from("global_notification_settings")
      .select("*")
      .limit(1)
      .single();

    // Fetch templates
    const { data: templates } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("template_key", template_key)
      .eq("is_active", true);

    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ error: "No active templates found", template_key }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeName = (order.team_stores as any)?.name || "Todd's Sport";
    const allVars = {
      customer_name: order.customer_name || "Customer",
      order_number: order.order_number || order.id,
      store_name: storeName,
      ...variables,
    };

    const results: any[] = [];

    for (const tmpl of templates) {
      if (force_channel && tmpl.channel !== force_channel) continue;

      if (tmpl.channel === "email" && settings?.default_email_enabled) {
        const rendered = renderTemplate(tmpl.body, allVars);
        const subject = tmpl.subject ? renderTemplate(tmpl.subject, allVars) : `Update on order ${allVars.order_number}`;

        // Log event
        const { data: evt } = await supabase.from("notification_events").insert({
          order_id,
          customer_id: customerId,
          channel: "email",
          template_key,
          recipient_address: order.customer_email,
          payload_snapshot: { subject, body: rendered, variables: allVars },
          status: "pending",
        }).select("id").single();

        try {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            const resend = new Resend(resendKey);
            const fromEmail = settings?.email_from_address || "orders@toddssport.com";
            await resend.emails.send({
              from: `${storeName} <${fromEmail}>`,
              to: [order.customer_email],
              subject,
              html: rendered,
            });
            await supabase.from("notification_events").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", evt?.id);
            results.push({ channel: "email", status: "sent" });
          } else {
            await supabase.from("notification_events").update({ status: "failed", error: "No RESEND_API_KEY" }).eq("id", evt?.id);
            results.push({ channel: "email", status: "failed", error: "No RESEND_API_KEY" });
          }
        } catch (e: any) {
          await supabase.from("notification_events").update({
            status: "failed",
            error: e.message,
            retry_count: 1,
          }).eq("id", evt?.id);
          results.push({ channel: "email", status: "failed", error: e.message });
        }
      }

      if (tmpl.channel === "sms" && settings?.default_sms_enabled) {
        const phoneResult = await selectSmsPhone(supabase, order);

        if (!phoneResult) {
          results.push({ channel: "sms", status: "skipped", reason: "no_eligible_phone" });
          continue;
        }

        const rendered = renderTemplate(tmpl.body, allVars);

        const { data: evt } = await supabase.from("notification_events").insert({
          order_id,
          customer_id: customerId,
          channel: "sms",
          template_key,
          recipient_address: phoneResult.phone,
          payload_snapshot: { body: rendered, variables: allVars },
          phone_selection_reason: phoneResult.reason,
          status: "pending",
        }).select("id").single();

        try {
          const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
          const twilioFrom = settings?.sms_sender_phone || Deno.env.get("TWILIO_FROM_PHONE");

          if (twilioSid && twilioAuth && twilioFrom) {
            const client = Twilio(twilioSid, twilioAuth);
            await client.messages.create({
              body: rendered,
              from: twilioFrom,
              to: phoneResult.phone,
            });
            await supabase.from("notification_events").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", evt?.id);
            results.push({ channel: "sms", status: "sent", phone: phoneResult.phone, reason: phoneResult.reason });
          } else {
            await supabase.from("notification_events").update({ status: "failed", error: "Twilio not configured" }).eq("id", evt?.id);
            results.push({ channel: "sms", status: "failed", error: "Twilio not configured" });
          }
        } catch (e: any) {
          await supabase.from("notification_events").update({
            status: "failed",
            error: e.message,
            retry_count: 1,
          }).eq("id", evt?.id);
          results.push({ channel: "sms", status: "failed", error: e.message });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-notification error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
