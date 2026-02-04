import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BuilderErrorRequest {
  errorType: string;
  errorMessage: string;
  sportSlug: string;
  sportTitle?: string;
  userAgent?: string;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: BuilderErrorRequest = await req.json();
    console.log("Champro builder error received:", JSON.stringify(body, null, 2));

    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    
    if (!slackWebhookUrl) {
      console.error("SLACK_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Error logged (Slack not configured)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send detailed Slack notification
    const slackPayload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "⚠️ Champro Builder Error",
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Error Type:*\n${body.errorType || "Unknown"}`,
            },
            {
              type: "mrkdwn",
              text: `*Sport:*\n${body.sportTitle || body.sportSlug}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Error Message:*\n\`\`\`${body.errorMessage || "No message provided"}\`\`\``,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `🕐 ${body.timestamp} | 🌐 ${body.userAgent?.substring(0, 80) || "Unknown"}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "This error originated from the Champro iframe builder. The customer may have seen an error dialog and could not add their design to cart.",
          },
        },
      ],
    };

    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });

    if (!slackResponse.ok) {
      console.error("Slack notification failed:", await slackResponse.text());
    } else {
      console.log("Slack notification sent successfully");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Error reported to Slack" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing builder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
