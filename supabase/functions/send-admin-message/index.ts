import { createClient } from "@supabase/supabase-js";
import { Resend } from "npm:resend@4.0.0";
import Twilio from "npm:twilio@5.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customer_id, order_id, channel, recipient_address, subject, body, sent_by } = await req.json();

    if (!channel || !recipient_address || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check opt-out for SMS
    if (channel === "sms") {
      const normalized = recipient_address.replace(/\D/g, "");
      const { data: optedOut } = await supabase
        .from("customer_channels")
        .select("sms_opted_out")
        .or(`phone.eq.${recipient_address},phone.eq.+${normalized},phone.eq.+1${normalized}`)
        .eq("sms_opted_out", true)
        .limit(1);

      if (optedOut && optedOut.length > 0) {
        return new Response(JSON.stringify({ error: "Phone number is opted out of SMS" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert admin message record
    const { data: msg, error: msgErr } = await supabase.from("admin_messages").insert({
      customer_id,
      order_id,
      channel,
      recipient_address,
      subject: channel === "email" ? subject : null,
      body,
      sent_by,
      status: "pending",
    }).select("id").single();

    if (msgErr) throw msgErr;

    // Send
    try {
      if (channel === "email") {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) throw new Error("RESEND_API_KEY not configured");

        const { data: settings } = await supabase
          .from("global_notification_settings")
          .select("email_from_address")
          .limit(1)
          .single();

        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: `Todd's Sport <${settings?.email_from_address || "orders@toddssport.com"}>`,
          to: [recipient_address],
          subject: subject || "Message from Todd's Sport",
          html: body,
        });
      } else if (channel === "sms") {
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioFrom = Deno.env.get("TWILIO_FROM_PHONE");

        if (!twilioSid || !twilioAuth || !twilioFrom) throw new Error("Twilio not configured");

        const client = Twilio(twilioSid, twilioAuth);
        await client.messages.create({
          body: body + "\nReply STOP to opt out.",
          from: twilioFrom,
          to: recipient_address,
        });
      }

      await supabase.from("admin_messages").update({
        status: "sent",
        sent_at: new Date().toISOString(),
      }).eq("id", msg?.id);

      return new Response(JSON.stringify({ ok: true, id: msg?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (sendErr: any) {
      await supabase.from("admin_messages").update({
        status: "failed",
        error: sendErr.message,
      }).eq("id", msg?.id);

      return new Response(JSON.stringify({ error: sendErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    console.error("send-admin-message error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
