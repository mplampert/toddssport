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

    // Build shipping address HTML
    let shippingHtml = "<em>Not provided</em>";
    if (payload.shipTo) {
      const s = payload.shipTo;
      shippingHtml = `
        <strong>${s.firstName} ${s.lastName}</strong><br>
        ${s.address}<br>
        ${s.address2 ? `${s.address2}<br>` : ""}
        ${s.city}, ${s.stateCode} ${s.zipCode}<br>
        ${s.countryCode}<br>
        ${s.phone ? `Phone: ${s.phone}` : ""}
      `;
    }

    // Build detailed error section for email
    let errorDetailsHtml = "";
    if (payload.errorDetails) {
      const details = payload.errorDetails;
      errorDetailsHtml = `
        <h2 style="color: #dc2626; margin-top: 24px;">Champro Error Details</h2>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
          ${details.messageCode ? `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background: #fef2f2;"><strong>Error Code</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px; background: #fef2f2;"><code style="background: #fee2e2; padding: 2px 6px; border-radius: 4px;">${details.messageCode}</code></td>
          </tr>` : ""}
          ${details.message ? `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Error Message</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${details.message}</td>
          </tr>` : ""}
          ${details.requestErrors && details.requestErrors.length > 0 ? `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Request Errors</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">
              <ul style="margin: 0; padding-left: 20px;">
                ${details.requestErrors.map(e => `<li>${e}</li>`).join("")}
              </ul>
            </td>
          </tr>` : ""}
          ${details.orderErrors && details.orderErrors.length > 0 ? `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Field Errors</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">
              <ul style="margin: 0; padding-left: 20px;">
                ${details.orderErrors.map(e => `<li><strong>${e.field || "Unknown"}:</strong> ${e.message}</li>`).join("")}
              </ul>
            </td>
          </tr>` : ""}
        </table>
      `;
    }

    // Format amount
    const formattedAmount = payload.amountTotal 
      ? `$${(payload.amountTotal / 100).toFixed(2)}` 
      : "N/A";

    const emailResponse = await resend.emails.send({
      from: "Todd's Sport <alerts@toddssport.com>",
      to: alertEmail.split(",").map((e: string) => e.trim()),
      subject: `🚨 MANUAL CHAMPRO PO REQUIRED - ${payload.po}${payload.errorDetails?.messageCode ? ` [${payload.errorDetails.messageCode}]` : ""}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Manual Champro PO Required</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Payment successful but Champro API submission failed</p>
          </div>
          
          <div style="border: 1px solid #ddd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            
            <h2 style="margin-top: 0; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">📋 Order Information</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>PO Number</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px; font-size: 18px; font-weight: bold; color: #2563eb;">${payload.po}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Internal Order ID</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><code>${payload.orderId}</code></td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Team Name</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.teamName || "<em>Not specified</em>"}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Sport</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.sportSlug || "<em>Not specified</em>"}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Lead Time</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.leadTime || "JUICE Standard"}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Quantity</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.quantity || "<em>Not specified</em>"}</td>
              </tr>
            </table>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">👤 Customer Information</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>Name</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.customerName || "<em>Not provided</em>"}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Email</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><a href="mailto:${payload.customerEmail}">${payload.customerEmail || "<em>Not provided</em>"}</a></td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Phone</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.customerPhone || "<em>Not provided</em>"}</td>
              </tr>
            </table>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">📦 Shipping Address</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #ddd;">
              ${shippingHtml}
            </div>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">🎨 Design Information</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>Champro Session ID</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${payload.champroSessionId || "<em>Not available</em>"}</code></td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Builder Link</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">
                  ${payload.champroSessionId 
                    ? `<a href="https://cb.champrosports.com/V2/Index?SessionId=${payload.champroSessionId}" target="_blank">View Design in Champro Builder</a>` 
                    : "<em>No session ID available</em>"}
                </td>
              </tr>
            </table>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">💳 Payment Information</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>Amount Paid</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px; font-size: 18px; font-weight: bold; color: #16a34a;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Stripe Session ID</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><code style="font-size: 12px;">${payload.stripeSessionId || "<em>Not available</em>"}</code></td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Stripe Dashboard</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">
                  ${payload.stripeSessionId 
                    ? `<a href="https://dashboard.stripe.com/payments?query=${payload.stripeSessionId}" target="_blank">View in Stripe Dashboard</a>` 
                    : "<em>Not available</em>"}
                </td>
              </tr>
            </table>

            ${errorDetailsHtml}
            
            <h2 style="margin-top: 24px;">Error Summary</h2>
            <pre style="background: #fef2f2; padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid #fecaca; white-space: pre-wrap; word-wrap: break-word;">${payload.errorMessage}</pre>
            
            ${payload.champroPayload ? `
            <details style="margin-top: 24px;">
              <summary style="cursor: pointer; font-weight: bold; padding: 8px; background: #f3f4f6; border-radius: 4px;">View Champro API Request Payload</summary>
              <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 11px; margin-top: 8px;">${JSON.stringify(payload.champroPayload, null, 2)}</pre>
            </details>
            ` : ""}
            
            ${payload.champroResponse ? `
            <details style="margin-top: 16px;">
              <summary style="cursor: pointer; font-weight: bold; padding: 8px; background: #f3f4f6; border-radius: 4px;">View Full Champro API Response</summary>
              <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 11px; margin-top: 8px;">${JSON.stringify(payload.champroResponse, null, 2)}</pre>
            </details>
            ` : ""}
            
            <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;">
            
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fcd34d;">
              <h3 style="margin: 0 0 8px 0; color: #92400e;">⚠️ Action Required</h3>
              <p style="margin: 0; color: #92400e;">
                The customer has been charged and will see a success page. You must manually submit this order to Champro using the information above.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              This is an automated alert from Todd's Sport order system. Generated at ${new Date().toISOString()}
            </p>
          </div>
        </div>
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
