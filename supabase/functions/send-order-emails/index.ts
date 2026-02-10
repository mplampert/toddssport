import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItem {
  name: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
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
  discount?: number;
  tax: number;
  shipping: number;
  fees?: { name: string; amount: number }[];
  feesTotal?: number;
  total: number;
  teamName?: string;
  storeName?: string;
  fulfillmentMethod?: string;
  paymentMethod?: string;
  paymentLast4?: string;
  sportSlug?: string;
  leadTime?: string;
  champroSessionId?: string;
  champroOrderNumber?: string;
  stripeSessionId?: string;
  siteUrl?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-ORDER-EMAILS] ${step}${detailsStr}`);
};

function fmtDollars(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function fulfillmentLabel(method?: string): string {
  const map: Record<string, string> = {
    ship: "Ship to Address",
    pickup: "Organization Pickup",
    local_pickup: "Local Pickup",
    deliver_to_coach: "Deliver to Coach",
    local_delivery: "Local Delivery",
  };
  return map[method || "ship"] || method || "Ship to Address";
}

function buildItemRowHtml(item: OrderItem): string {
  const lineTotal = item.quantity * item.price;
  const imgCell = item.imageUrl
    ? `<td style="padding:12px 8px;border-bottom:1px solid #eee;width:56px;vertical-align:top;">
        <img src="${item.imageUrl}" alt="" width="48" height="48" style="border-radius:6px;object-fit:cover;display:block;" />
       </td>`
    : `<td style="padding:12px 8px;border-bottom:1px solid #eee;width:56px;vertical-align:top;">
        <div style="width:48px;height:48px;background:#f3f4f6;border-radius:6px;"></div>
       </td>`;

  const variant = [item.size, item.color].filter(Boolean).join(" / ");

  return `<tr>
    ${imgCell}
    <td style="padding:12px 8px;border-bottom:1px solid #eee;vertical-align:top;">
      <div style="font-weight:600;color:#111;">${item.name}</div>
      ${variant ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">${variant}</div>` : ""}
    </td>
    <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:center;vertical-align:top;color:#374151;">${item.quantity}</td>
    <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;color:#374151;">${fmtDollars(item.price)}</td>
    <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;font-weight:600;color:#111;">${fmtDollars(lineTotal)}</td>
  </tr>`;
}

function buildCustomerEmail(p: OrderEmailPayload): string {
  const firstName = p.customerName.split(" ")[0] || "there";
  const store = p.storeName || p.teamName || "Todd's Sporting Goods";
  const siteUrl = p.siteUrl || "https://toddssport.lovable.app";
  const orderUrl = `${siteUrl}/account/orders/${p.orderId}`;
  const hasShipping = p.shipTo.address && p.shipTo.city;
  const hasFulfillment = p.fulfillmentMethod && p.fulfillmentMethod !== "ship";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">Thank you for your order, ${firstName}!</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">We've received your order <strong>${p.po}</strong> from <strong>${store}</strong>.</p>
  </td></tr>

  <!-- Order meta -->
  <tr><td style="padding:28px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;">
      <tr>
        <td style="padding:6px 16px;"><span style="color:#6b7280;font-size:13px;">Order Number</span><br><strong style="color:#111;">${p.po}</strong></td>
        <td style="padding:6px 16px;"><span style="color:#6b7280;font-size:13px;">Order Date</span><br><strong style="color:#111;">${formatDate(p.orderDate)}</strong></td>
        <td style="padding:6px 16px;"><span style="color:#6b7280;font-size:13px;">Status</span><br><strong style="color:#16a34a;">Confirmed</strong></td>
      </tr>
      ${p.teamName ? `<tr><td colspan="3" style="padding:6px 16px;"><span style="color:#6b7280;font-size:13px;">Store</span><br><strong style="color:#111;">${p.teamName}</strong></td></tr>` : ""}
    </table>
  </td></tr>

  <!-- Items -->
  <tr><td style="padding:28px 40px 0;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#111;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Order Items</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="background:#f8fafc;">
        <th style="padding:10px 8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;width:56px;"></th>
        <th style="padding:10px 8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
        <th style="padding:10px 8px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
        <th style="padding:10px 8px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
        <th style="padding:10px 8px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
      </tr>
      ${p.items.length > 0 ? p.items.map(buildItemRowHtml).join("") : `<tr><td colspan="5" style="padding:20px;text-align:center;color:#6b7280;">Custom order (see order details)</td></tr>`}
    </table>
  </td></tr>

  <!-- Pricing -->
  <tr><td style="padding:20px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;">
      <tr>
        <td style="padding:4px 0;color:#374151;">Subtotal</td>
        <td style="padding:4px 0;text-align:right;color:#374151;">${fmtDollars(p.subtotal)}</td>
      </tr>
      ${(p.discount && p.discount > 0) ? `<tr>
        <td style="padding:4px 0;color:#dc2626;">Discount</td>
        <td style="padding:4px 0;text-align:right;color:#dc2626;">-${fmtDollars(p.discount)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:4px 0;color:#374151;">Tax</td>
        <td style="padding:4px 0;text-align:right;color:#374151;">${fmtDollars(p.tax)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#374151;">Shipping</td>
        <td style="padding:4px 0;text-align:right;color:#374151;">${fmtDollars(p.shipping)}</td>
      </tr>
      ${(p.fees && p.fees.length > 0) ? p.fees.map(f => `<tr>
        <td style="padding:4px 0;color:#374151;">${f.name}</td>
        <td style="padding:4px 0;text-align:right;color:#374151;">${fmtDollars(f.amount)}</td>
      </tr>`).join("") : ""}
      <tr>
        <td style="padding:12px 0 4px;border-top:2px solid #e5e7eb;font-size:18px;font-weight:700;color:#111;">Order Total</td>
        <td style="padding:12px 0 4px;border-top:2px solid #e5e7eb;text-align:right;font-size:18px;font-weight:700;color:#111;">${fmtDollars(p.total)}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Shipping / Fulfillment -->
  <tr><td style="padding:28px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${hasShipping ? `
      <tr><td style="width:50%;vertical-align:top;padding-right:12px;">
        <h3 style="margin:0 0 8px;font-size:15px;color:#111;">📦 ${fulfillmentLabel(p.fulfillmentMethod)}</h3>
        <div style="background:#f8fafc;border-radius:8px;padding:14px;font-size:14px;color:#374151;">
          <strong>${p.shipTo.firstName} ${p.shipTo.lastName}</strong><br>
          ${p.shipTo.address}<br>
          ${p.shipTo.address2 ? `${p.shipTo.address2}<br>` : ""}
          ${p.shipTo.city}, ${p.shipTo.stateCode} ${p.shipTo.zipCode}
          ${p.shipTo.phone ? `<br>📱 ${p.shipTo.phone}` : ""}
        </div>
      </td>
      <td style="width:50%;vertical-align:top;padding-left:12px;">
        <h3 style="margin:0 0 8px;font-size:15px;color:#111;">💳 Payment</h3>
        <div style="background:#f8fafc;border-radius:8px;padding:14px;font-size:14px;color:#374151;">
          ${p.paymentMethod && p.paymentLast4 ? `${p.paymentMethod} ending in ${p.paymentLast4}` : "Card payment"}
          <br>Amount charged: <strong>${fmtDollars(p.total)}</strong>
        </div>
      </td></tr>
      ` : `
      <tr><td>
        <h3 style="margin:0 0 8px;font-size:15px;color:#111;">📦 ${fulfillmentLabel(p.fulfillmentMethod)}</h3>
        ${hasFulfillment ? `<div style="background:#f8fafc;border-radius:8px;padding:14px;font-size:14px;color:#374151;">Details will be provided by your organization.</div>` : ""}
      </td></tr>
      `}
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:32px 40px 0;text-align:center;">
    <a href="${orderUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View Your Order</a>
  </td></tr>

  <!-- What's next -->
  <tr><td style="padding:28px 40px 0;">
    <div style="background:#e8f4fd;border-radius:8px;border-left:4px solid #1e3a5f;padding:16px;">
      <h3 style="margin:0 0 8px;color:#1e3a5f;font-size:15px;">What's Next?</h3>
      <ul style="margin:0;padding-left:20px;color:#1e3a5f;font-size:14px;line-height:1.6;">
        <li>Your order is now being processed</li>
        <li>You'll receive updates when your order ships</li>
        <li>Typical production time is ${p.leadTime || "2–3 weeks"}</li>
      </ul>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:32px 40px;text-align:center;">
    <p style="color:#6b7280;font-size:13px;margin:0;">
      Questions? Contact us at <a href="mailto:orders@toddssportinggoods.com" style="color:#1e3a5f;">orders@toddssportinggoods.com</a>
      or call <a href="tel:+19786543210" style="color:#1e3a5f;">(978) 654-3210</a>
    </p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">
      Todd's Sporting Goods · Your trusted partner for custom team apparel
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function buildInternalEmail(p: OrderEmailPayload): string {
  const store = p.storeName || p.teamName || "Unknown Store";

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:800px;margin:0 auto;">
    <div style="background:#16a34a;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;font-size:22px;">✅ New Order Received</h1>
      <p style="margin:6px 0 0;opacity:0.9;">Payment successful · ${store}</p>
    </div>
    <div style="border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px;">

      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;width:30%;"><strong>Order #</strong></td>
            <td style="border:1px solid #ddd;padding:10px;font-size:18px;font-weight:bold;color:#2563eb;">${p.po}</td></tr>
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Date</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${formatDate(p.orderDate)}</td></tr>
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Store</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${store}</td></tr>
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Order ID</strong></td>
            <td style="border:1px solid #ddd;padding:10px;"><code>${p.orderId}</code></td></tr>
      </table>

      <h2 style="border-bottom:2px solid #2563eb;padding-bottom:8px;">👤 Customer</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;width:30%;"><strong>Name</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${p.customerName}</td></tr>
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Email</strong></td>
            <td style="border:1px solid #ddd;padding:10px;"><a href="mailto:${p.customerEmail}">${p.customerEmail}</a></td></tr>
        ${p.customerPhone ? `<tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Phone</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${p.customerPhone}</td></tr>` : ""}
      </table>

      ${p.shipTo.address ? `
      <h2 style="border-bottom:2px solid #2563eb;padding-bottom:8px;">📦 Shipping</h2>
      <div style="background:#f9fafb;padding:14px;border-radius:8px;margin-bottom:20px;border:1px solid #ddd;">
        <strong>${p.shipTo.firstName} ${p.shipTo.lastName}</strong><br>
        ${p.shipTo.address}<br>
        ${p.shipTo.address2 ? `${p.shipTo.address2}<br>` : ""}
        ${p.shipTo.city}, ${p.shipTo.stateCode} ${p.shipTo.zipCode}
        ${p.shipTo.phone ? `<br>Phone: ${p.shipTo.phone}` : ""}
      </div>` : ""}

      <h2 style="border-bottom:2px solid #2563eb;padding-bottom:8px;">🛒 Items</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        <thead><tr style="background:#f9fafb;">
          <th style="border:1px solid #ddd;padding:10px;text-align:left;">Item</th>
          <th style="border:1px solid #ddd;padding:10px;text-align:center;">Size/Color</th>
          <th style="border:1px solid #ddd;padding:10px;text-align:center;">Qty</th>
          <th style="border:1px solid #ddd;padding:10px;text-align:right;">Price</th>
          <th style="border:1px solid #ddd;padding:10px;text-align:right;">Total</th>
        </tr></thead>
        <tbody>
          ${p.items.length > 0 ? p.items.map(i => `<tr>
            <td style="border:1px solid #ddd;padding:10px;">${i.name}</td>
            <td style="border:1px solid #ddd;padding:10px;text-align:center;">${[i.size, i.color].filter(Boolean).join(" / ") || "—"}</td>
            <td style="border:1px solid #ddd;padding:10px;text-align:center;">${i.quantity}</td>
            <td style="border:1px solid #ddd;padding:10px;text-align:right;">${fmtDollars(i.price)}</td>
            <td style="border:1px solid #ddd;padding:10px;text-align:right;font-weight:600;">${fmtDollars(i.quantity * i.price)}</td>
          </tr>`).join("") : `<tr><td colspan="5" style="border:1px solid #ddd;padding:12px;text-align:center;color:#666;">Custom order</td></tr>`}
        </tbody>
      </table>

      <h2 style="border-bottom:2px solid #2563eb;padding-bottom:8px;">💳 Payment</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Subtotal</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${fmtDollars(p.subtotal)}</td></tr>
        ${(p.discount && p.discount > 0) ? `<tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Discount</strong></td>
            <td style="border:1px solid #ddd;padding:10px;color:#dc2626;">-${fmtDollars(p.discount)}</td></tr>` : ""}
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Tax</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${fmtDollars(p.tax)}</td></tr>
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Shipping</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${fmtDollars(p.shipping)}</td></tr>
        ${(p.fees && p.fees.length > 0) ? p.fees.map(f => `<tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>${f.name}</strong></td>
            <td style="border:1px solid #ddd;padding:10px;">${fmtDollars(f.amount)}</td></tr>`).join("") : ""}
        <tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Total</strong></td>
            <td style="border:1px solid #ddd;padding:10px;font-size:18px;font-weight:bold;color:#16a34a;">${fmtDollars(p.total)}</td></tr>
        ${p.stripeSessionId ? `<tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Stripe</strong></td>
            <td style="border:1px solid #ddd;padding:10px;"><a href="https://dashboard.stripe.com/payments?query=${p.stripeSessionId}" target="_blank">View in Stripe</a></td></tr>` : ""}
      </table>

      ${p.champroSessionId || p.champroOrderNumber ? `
      <h2 style="border-bottom:2px solid #2563eb;padding-bottom:8px;">🎨 Champro</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        ${p.champroSessionId ? `<tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Session</strong></td>
            <td style="border:1px solid #ddd;padding:10px;"><a href="https://cb.champrosports.com/V2/Index?SessionId=${p.champroSessionId}" target="_blank">View Design</a></td></tr>` : ""}
        ${p.champroOrderNumber ? `<tr><td style="border:1px solid #ddd;padding:10px;background:#f9fafb;"><strong>Champro #</strong></td>
            <td style="border:1px solid #ddd;padding:10px;font-weight:bold;color:#16a34a;">${p.champroOrderNumber}</td></tr>` : ""}
      </table>` : ""}

      <p style="color:#6b7280;font-size:11px;margin-top:24px;">Generated ${new Date().toISOString()}</p>
    </div>
  </div>`;
}

async function sendCustomerConfirmationEmail(
  resend: Resend,
  payload: OrderEmailPayload
): Promise<boolean> {
  try {
    const store = payload.storeName || payload.teamName || "Todd's Sporting Goods";
    logStep("Sending customer confirmation email", { to: payload.customerEmail });

    const emailResponse = await resend.emails.send({
      from: `${store} <stores@toddssportinggoods.com>`,
      to: [payload.customerEmail],
      subject: `Order ${payload.po} Confirmed – ${store}`,
      html: buildCustomerEmail(payload),
    });

    if (emailResponse.error) {
      logStep("Customer email failed", { error: emailResponse.error });
      return false;
    }
    logStep("Customer email sent", { id: emailResponse.data?.id });
    return true;
  } catch (error) {
    logStep("Customer email error", { error: String(error) });
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
    logStep("Sending internal notification", { to: alertEmail });

    const emailResponse = await resend.emails.send({
      from: `Todds Sport Alerts <${fromEmail}>`,
      to: alertEmail.split(",").map((e: string) => e.trim()),
      subject: `New order received – ${payload.po}`,
      html: buildInternalEmail(payload),
    });

    if (emailResponse.error) {
      logStep("Internal email failed", { error: emailResponse.error });
      return false;
    }
    logStep("Internal email sent", { id: emailResponse.data?.id });
    return true;
  } catch (error) {
    logStep("Internal email error", { error: String(error) });
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

    const emailPromises: Promise<boolean>[] = [];

    if (payload.customerEmail) {
      emailPromises.push(sendCustomerConfirmationEmail(resend, payload));
    } else {
      logStep("No customer email, skipping customer confirmation");
    }

    if (orderAlertEmail) {
      emailPromises.push(sendInternalNotificationEmail(resend, fromEmail, orderAlertEmail, payload));
    } else {
      logStep("ORDER_ALERT_EMAIL not set, skipping internal notification");
    }

    const results = await Promise.all(emailPromises);

    const customerEmailSent = payload.customerEmail ? results[0] : false;
    const internalEmailSent = orderAlertEmail ? results[payload.customerEmail ? 1 : 0] : false;

    logStep("Emails complete", { customer: customerEmailSent, internal: internalEmailSent });

    return new Response(
      JSON.stringify({ success: true, customerEmail: customerEmailSent, internalEmail: internalEmailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
