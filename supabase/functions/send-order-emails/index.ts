import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItem {
  name: string;
  size?: string;
  quantity: number;
  price: number;
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

interface OrderEmailPayload {
  orderId: string;
  po: string;
  orderDate: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shipTo: ShipTo;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  teamName?: string;
  sportSlug?: string;
  leadTime?: string;
  champroSessionId?: string;
  champroOrderNumber?: string;
  stripeSessionId?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-ORDER-EMAILS] ${step}${detailsStr}`);
};

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildShippingAddressHtml(shipTo: ShipTo): string {
  return `
    <strong>${shipTo.firstName} ${shipTo.lastName}</strong><br>
    ${shipTo.address}<br>
    ${shipTo.address2 ? `${shipTo.address2}<br>` : ""}
    ${shipTo.city}, ${shipTo.stateCode} ${shipTo.zipCode}<br>
    ${shipTo.countryCode}${shipTo.phone ? `<br>Phone: ${shipTo.phone}` : ""}
  `;
}

function buildItemsTableHtml(items: OrderItem[]): string {
  if (items.length === 0) {
    return `<tr><td colspan="4" style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #666;">Custom uniform design (see order details)</td></tr>`;
  }
  
  return items.map(item => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 12px;">${item.name}</td>
      <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.size || 'N/A'}</td>
      <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${formatCurrency(item.price)}</td>
    </tr>
  `).join('');
}

async function sendCustomerConfirmationEmail(
  resend: Resend,
  fromEmail: string,
  payload: OrderEmailPayload
): Promise<boolean> {
  try {
    logStep("Sending customer confirmation email", { to: payload.customerEmail });

    const emailResponse = await resend.emails.send({
      from: `Todds Sport Orders <${fromEmail}>`,
      to: [payload.customerEmail],
      subject: `Your order is confirmed – ${payload.po}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: #1e3a5f; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Order Confirmed!</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Thank you for your order</p>
          </div>
          
          <div style="border: 1px solid #ddd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            
            <p style="font-size: 16px;">Hi ${payload.customerName},</p>
            
            <p>Thank you for your order! We're excited to get started on your custom gear. Here's a summary of your purchase:</p>
            
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Order Number:</strong></td>
                  <td style="padding: 4px 0; text-align: right;">${payload.po}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Order Date:</strong></td>
                  <td style="padding: 4px 0; text-align: right;">${formatDate(payload.orderDate)}</td>
                </tr>
                ${payload.teamName ? `
                <tr>
                  <td style="padding: 4px 0;"><strong>Team Name:</strong></td>
                  <td style="padding: 4px 0; text-align: right;">${payload.teamName}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <h2 style="border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-top: 32px;">📦 Shipping Address</h2>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              ${buildShippingAddressHtml(payload.shipTo)}
            </div>
            
            <h2 style="border-bottom: 2px solid #1e3a5f; padding-bottom: 8px;">🛒 Order Items</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Item</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Size</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Qty</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${buildItemsTableHtml(payload.items)}
              </tbody>
            </table>
            
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right;">${formatCurrency(payload.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Tax:</td>
                  <td style="padding: 4px 0; text-align: right;">${formatCurrency(payload.tax)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Shipping:</td>
                  <td style="padding: 4px 0; text-align: right;">${formatCurrency(payload.shipping)}</td>
                </tr>
                <tr style="font-size: 18px; font-weight: bold;">
                  <td style="padding: 8px 0; border-top: 2px solid #ddd;">Total:</td>
                  <td style="padding: 8px 0; border-top: 2px solid #ddd; text-align: right; color: #16a34a;">${formatCurrency(payload.total)}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #e8f4fd; padding: 16px; border-radius: 8px; border-left: 4px solid #1e3a5f; margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; color: #1e3a5f;">What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #1e3a5f;">
                <li>Your order is now being processed</li>
                <li>You'll receive another email when your order ships</li>
                <li>Typical production time is ${payload.leadTime || '2-3 weeks'}</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Questions about your order? Reply to this email or contact us at 
              <a href="mailto:orders@toddssportinggoods.com" style="color: #1e3a5f;">orders@toddssportinggoods.com</a>
            </p>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              Todd's Sporting Goods<br>
              Your trusted partner for custom team apparel
            </p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      logStep("Customer confirmation email failed", { error: emailResponse.error });
      return false;
    }

    logStep("Customer confirmation email sent", { id: emailResponse.data?.id });
    return true;
  } catch (error) {
    logStep("Customer confirmation email error", { error: String(error) });
    return false;
  }
}

async function sendInternalNotificationEmail(
  resend: Resend,
  fromEmail: string,
  alertEmail: string,
  payload: OrderEmailPayload
): Promise<boolean> {
  try {
    logStep("Sending internal notification email", { to: alertEmail });

    const emailResponse = await resend.emails.send({
      from: `Todds Sport Alerts <${fromEmail}>`,
      to: alertEmail.split(",").map((e: string) => e.trim()),
      subject: `New order received – ${payload.po}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: #16a34a; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ New Order Received</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Payment successful – order ready for processing</p>
          </div>
          
          <div style="border: 1px solid #ddd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            
            <h2 style="margin-top: 0; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">📋 Order Information</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>PO Number</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px; font-size: 18px; font-weight: bold; color: #2563eb;">${payload.po}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Order Date</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${formatDate(payload.orderDate)}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Internal Order ID</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><code>${payload.orderId}</code></td>
              </tr>
              ${payload.teamName ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Team Name</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.teamName}</td>
              </tr>
              ` : ''}
              ${payload.sportSlug ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Sport</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.sportSlug}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Lead Time</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.leadTime || 'Standard'}</td>
              </tr>
            </table>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">👤 Customer Information</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>Name</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.customerName}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Email</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><a href="mailto:${payload.customerEmail}">${payload.customerEmail}</a></td>
              </tr>
              ${payload.customerPhone ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Phone</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${payload.customerPhone}</td>
              </tr>
              ` : ''}
            </table>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">📦 Shipping Address</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #ddd;">
              ${buildShippingAddressHtml(payload.shipTo)}
            </div>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">🛒 Order Items</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Item</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Size</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Qty</th>
                  <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${buildItemsTableHtml(payload.items)}
              </tbody>
            </table>

            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">💳 Payment Summary</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>Subtotal</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${formatCurrency(payload.subtotal)}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Tax</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${formatCurrency(payload.tax)}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Shipping</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">${formatCurrency(payload.shipping)}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Total Paid</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px; font-size: 18px; font-weight: bold; color: #16a34a;">${formatCurrency(payload.total)}</td>
              </tr>
              ${payload.stripeSessionId ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Stripe Session</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><code style="font-size: 11px;">${payload.stripeSessionId}</code></td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Stripe Dashboard</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">
                  <a href="https://dashboard.stripe.com/payments?query=${payload.stripeSessionId}" target="_blank">View in Stripe Dashboard</a>
                </td>
              </tr>
              ` : ''}
            </table>

            ${payload.champroSessionId || payload.champroOrderNumber ? `
            <h2 style="border-bottom: 2px solid #2563eb; padding-bottom: 8px;">🎨 Champro Information</h2>
            <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
              ${payload.champroSessionId ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; width: 30%; background: #f9fafb;"><strong>Session ID</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;"><code>${payload.champroSessionId}</code></td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Builder Link</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px;">
                  <a href="https://cb.champrosports.com/V2/Index?SessionId=${payload.champroSessionId}" target="_blank">View Design</a>
                </td>
              </tr>
              ` : ''}
              ${payload.champroOrderNumber ? `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px; background: #f9fafb;"><strong>Champro Order #</strong></td>
                <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold; color: #16a34a;">${payload.champroOrderNumber}</td>
              </tr>
              ` : ''}
            </table>
            ` : ''}
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              This is an automated notification from Todd's Sport order system. Generated at ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      logStep("Internal notification email failed", { error: emailResponse.error });
      return false;
    }

    logStep("Internal notification email sent", { id: emailResponse.data?.id });
    return true;
  } catch (error) {
    logStep("Internal notification email error", { error: String(error) });
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "matt@toddssportinggoods.com";
    const orderAlertEmail = Deno.env.get("ORDER_ALERT_EMAIL");

    if (!resendApiKey) {
      logStep("Resend API key not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const payload: OrderEmailPayload = await req.json();

    logStep("Received payload", { orderId: payload.orderId, po: payload.po, customerEmail: payload.customerEmail });

    // Send both emails in parallel
    const emailPromises: Promise<boolean>[] = [];

    // Customer confirmation email (always sent if customer email exists)
    if (payload.customerEmail) {
      emailPromises.push(sendCustomerConfirmationEmail(resend, fromEmail, payload));
    } else {
      logStep("No customer email provided, skipping customer confirmation");
    }

    // Internal notification email (if ORDER_ALERT_EMAIL is configured)
    if (orderAlertEmail) {
      emailPromises.push(sendInternalNotificationEmail(resend, fromEmail, orderAlertEmail, payload));
    } else {
      logStep("ORDER_ALERT_EMAIL not configured, skipping internal notification");
    }

    const results = await Promise.all(emailPromises);

    const customerEmailSent = payload.customerEmail ? results[0] : false;
    const internalEmailSent = orderAlertEmail ? results[payload.customerEmail ? 1 : 0] : false;

    logStep("Emails complete", { customer: customerEmailSent, internal: internalEmailSent });

    return new Response(
      JSON.stringify({
        success: true,
        customerEmail: customerEmailSent,
        internalEmail: internalEmailSent,
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
