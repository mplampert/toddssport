import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderFailurePayload {
  orderId: string;
  po: string;
  customerEmail?: string;
  errorMessage: string;
  champroResponse?: unknown;
  stripeSessionId?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-ORDER-FAILURE] ${step}${detailsStr}`);
};

async function sendSlackNotification(payload: OrderFailurePayload): Promise<boolean> {
  const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!slackWebhookUrl) {
    logStep("Slack webhook URL not configured, skipping");
    return false;
  }

  try {
    const message = {
      text: `🚨 *Champro Order Failed* 🚨`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Champro Order Failed",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Order ID:*\n${payload.orderId}` },
            { type: "mrkdwn", text: `*PO:*\n${payload.po}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Customer:*\n${payload.customerEmail || "N/A"}` },
            { type: "mrkdwn", text: `*Stripe Session:*\n${payload.stripeSessionId || "N/A"}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Error:*\n\`\`\`${payload.errorMessage}\`\`\``,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Payment was successful but Champro order failed. Manual intervention required.`,
            },
          ],
        },
      ],
    };

    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      logStep("Slack notification sent successfully");
      return true;
    } else {
      logStep("Slack notification failed", { status: response.status });
      return false;
    }
  } catch (error) {
    logStep("Slack notification error", { error: String(error) });
    return false;
  }
}

async function sendEmailNotification(payload: OrderFailurePayload): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const alertEmail = Deno.env.get("ALERT_EMAIL");

  if (!resendApiKey) {
    logStep("Resend API key not configured, skipping email");
    return false;
  }

  if (!alertEmail) {
    logStep("Alert email not configured, skipping email");
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "Todd's Sport <alerts@toddssport.com>",
      to: alertEmail.split(",").map((e: string) => e.trim()),
      subject: `🚨 Champro Order Failed - PO: ${payload.po}`,
      html: `
        <h1 style="color: #dc2626;">Champro Order Failed</h1>
        <p>A Stripe payment was successful but the Champro order submission failed. Manual intervention is required.</p>
        
        <h2>Order Details</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Order ID</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${payload.orderId}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>PO Number</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${payload.po}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Customer Email</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${payload.customerEmail || "N/A"}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Stripe Session ID</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${payload.stripeSessionId || "N/A"}</td>
          </tr>
        </table>
        
        <h2>Error Details</h2>
        <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto;">${payload.errorMessage}</pre>
        
        ${payload.champroResponse ? `
        <h2>Champro API Response</h2>
        <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto;">${JSON.stringify(payload.champroResponse, null, 2)}</pre>
        ` : ""}
        
        <hr style="margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated alert from Todd's Sport order system.</p>
      `,
    });

    logStep("Email notification sent successfully", { response: emailResponse });
    return true;
  } catch (error) {
    logStep("Email notification error", { error: String(error) });
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const payload: OrderFailurePayload = await req.json();
    logStep("Received payload", { orderId: payload.orderId, po: payload.po });

    // Send both notifications in parallel
    const [slackResult, emailResult] = await Promise.all([
      sendSlackNotification(payload),
      sendEmailNotification(payload),
    ]);

    logStep("Notifications complete", { slack: slackResult, email: emailResult });

    return new Response(
      JSON.stringify({
        success: true,
        slack: slackResult,
        email: emailResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
