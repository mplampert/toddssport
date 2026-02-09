import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPT_OUT_KEYWORDS = [
  "stop", "cancel", "end", "quit", "unsubscribe", "stopall", "optout", "revoke",
];

const OPT_IN_KEYWORDS = ["start", "unstop", "yes"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Twilio sends form-urlencoded
    const formData = await req.formData();
    const fromPhone = formData.get("From")?.toString() || "";
    const body = formData.get("Body")?.toString() || "";
    const messageSid = formData.get("MessageSid")?.toString() || "";

    console.log(`[TWILIO-WEBHOOK] Inbound SMS from ${fromPhone}: "${body}"`);

    const bodyLower = body.trim().toLowerCase();
    const isOptOut = OPT_OUT_KEYWORDS.includes(bodyLower);
    const isOptIn = OPT_IN_KEYWORDS.includes(bodyLower);

    // Find customer by phone
    const normalized = fromPhone.replace(/\D/g, "");
    const { data: channels } = await supabase
      .from("customer_channels")
      .select("*, customers(id, name, email)")
      .or(`phone.eq.${fromPhone},phone.eq.+${normalized},phone.eq.+1${normalized}`);

    const channel = channels?.[0];
    const customerId = (channel?.customers as any)?.id || null;

    // Store inbound message
    await supabase.from("inbound_messages").insert({
      customer_id: customerId,
      from_phone: fromPhone,
      body,
      is_opt_out: isOptOut,
      is_opt_in: isOptIn,
      twilio_message_sid: messageSid,
      processed: true,
    });

    // Handle opt-out
    if (isOptOut && channel) {
      await supabase
        .from("customer_channels")
        .update({
          sms_opted_out: true,
          sms_opted_out_at: new Date().toISOString(),
          sms_opt_out_keyword: bodyLower,
          sms_enabled_transactional: false,
        })
        .eq("id", channel.id);

      console.log(`[TWILIO-WEBHOOK] Opted out phone ${fromPhone}`);
    }

    // Handle opt-in (re-subscribe)
    if (isOptIn && channel) {
      await supabase
        .from("customer_channels")
        .update({
          sms_opted_out: false,
          sms_opted_in_at: new Date().toISOString(),
          sms_enabled_transactional: true,
        })
        .eq("id", channel.id);

      console.log(`[TWILIO-WEBHOOK] Opted in phone ${fromPhone}`);
    }

    // Return TwiML empty response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (e: any) {
    console.error("[TWILIO-WEBHOOK] Error:", e);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
});
