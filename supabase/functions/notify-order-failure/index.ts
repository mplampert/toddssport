import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ErrorDetails {
  messageCode?: string | null;
  message?: string | null;
  requestErrors?: string[];
  orderErrors?: { message?: string; field?: string }[];
}

interface ShipTo {
  firstName: string;
  lastName: string;
  address: string;
  address2: string;
  city: string;
  stateCode: string;
  zipCode: string;
  countryCode: string;
  phone: string;
}

interface OrderFailurePayload {
  orderId: string;
  po: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  shipTo?: ShipTo;
  teamName?: string;
  champroSessionId?: string;
  sportSlug?: string;
  leadTime?: string;
  quantity?: string;
  amountTotal?: number;
  errorMessage: string;
  errorDetails?: ErrorDetails;
  champroResponse?: unknown;
  champroPayload?: unknown;
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
    // Build detailed error section for Slack
    const errorBlocks = [];
    
    // Main error message
    errorBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error:*\n\`\`\`${payload.errorMessage}\`\`\``,
      },
    });
    
    // Add detailed error info if available
    if (payload.errorDetails) {
      const details = payload.errorDetails;
      let detailText = "";
      
      if (details.messageCode) {
        detailText += `*MessageCode:* \`${details.messageCode}\`\n`;
      }
      if (details.message) {
        detailText += `*Message:* ${details.message}\n`;
      }
      if (details.requestErrors && details.requestErrors.length > 0) {
        detailText += `*Request Errors:*\n${details.requestErrors.map(e => `• ${e}`).join("\n")}\n`;
      }
      if (details.orderErrors && details.orderErrors.length > 0) {
        detailText += `*Order Errors:*\n${details.orderErrors.map(e => `• ${e.message}${e.field ? ` (Field: ${e.field})` : ""}`).join("\n")}\n`;
      }
      
      if (detailText) {
        errorBlocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: detailText,
          },
        });
      }
    }

    // Build shipping address for Slack
    let shippingText = "N/A";
    if (payload.shipTo) {
      const s = payload.shipTo;
      shippingText = `${s.firstName} ${s.lastName}\n${s.address}${s.address2 ? `, ${s.address2}` : ""}\n${s.city}, ${s.stateCode} ${s.zipCode}`;
    }

    const message = {
      text: `🚨 *Champro Order Failed - Manual PO Required* 🚨`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 MANUAL CHAMPRO PO REQUIRED",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*PO Number:*\n${payload.po}` },
            { type: "mrkdwn", text: `*Order ID:*\n${payload.orderId}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Customer:*\n${payload.customerName || "N/A"}\n${payload.customerEmail || "N/A"}\n${payload.customerPhone || "N/A"}` },
            { type: "mrkdwn", text: `*Team Name:*\n${payload.teamName || "N/A"}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Ship To:*\n${shippingText}` },
            { type: "mrkdwn", text: `*Sport:*\n${payload.sportSlug || "N/A"}\n*Lead Time:*\n${payload.leadTime || "N/A"}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Champro Session ID:*\n\`${payload.champroSessionId || "N/A"}\`` },
            { type: "mrkdwn", text: `*Amount:*\n$${payload.amountTotal ? (payload.amountTotal / 100).toFixed(2) : "N/A"}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Stripe Session:*\n${payload.stripeSessionId || "N/A"}` },
            { type: "mrkdwn", text: `*Quantity:*\n${payload.quantity || "N/A"}` },
          ],
        },
        ...errorBlocks,
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `⚠️ Payment was successful. Customer will see success page. You must manually submit this order to Champro.`,
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

// Email notifications temporarily disabled
// TODO: Re-enable with SendGrid or NotificationAPI when ready
async function sendEmailNotification(_payload: OrderFailurePayload): Promise<boolean> {
  logStep("Email notifications disabled - relying on Slack only");
  return false;
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
