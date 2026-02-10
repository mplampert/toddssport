import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  first_name: string;
  last_name: string;
  staff_role: string;
  phone?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Invalid token");

    // Check admin role
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: callerEmp } = await supabaseAdmin
      .from("employee_profiles")
      .select("staff_role")
      .eq("id", caller.id)
      .maybeSingle();

    const isAdmin = !!callerRole || (callerEmp?.staff_role === "owner" || callerEmp?.staff_role === "admin");
    if (!isAdmin) throw new Error("Not authorized");

    const { email, first_name, last_name, staff_role, phone }: InviteRequest = await req.json();

    if (!email || !first_name || !staff_role) {
      throw new Error("Missing required fields: email, first_name, staff_role");
    }

    // Generate a temporary password
    const tempPassword = crypto.randomUUID().slice(0, 16);

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (authError) {
      // If user already exists, just update employee_profiles
      if (authError.message?.includes("already been registered")) {
        // Find existing user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users?.find((u: any) => u.email === email);
        if (!existing) throw new Error("User exists but could not be found");

        // Reset password so we can send fresh credentials
        const newTempPassword = crypto.randomUUID().slice(0, 16);
        await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: newTempPassword });

        // Upsert employee profile
        const { error: epError } = await supabaseAdmin
          .from("employee_profiles")
          .upsert({
            id: existing.id,
            email,
            first_name,
            last_name: last_name || null,
            phone: phone || null,
            role: "admin",
            staff_role,
            is_active: true,
            invite_status: "invited",
          }, { onConflict: "id" });

        if (epError) throw epError;

        // Ensure user_roles entry exists
        await supabaseAdmin.from("user_roles").upsert(
          { user_id: existing.id, role: "admin" },
          { onConflict: "user_id,role" }
        );

        // Send invite email for existing user
        const resendKeyExisting = Deno.env.get("RESEND_API_KEY");
        const fromEmailExisting = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@toddssportinggoods.com";
        if (resendKeyExisting) {
          const resendExisting = new Resend(resendKeyExisting);
          const siteUrlExisting = Deno.env.get("SITE_URL") || "https://toddssportinggoods.com";
          await resendExisting.emails.send({
            from: `Todd's Sporting Goods <${fromEmailExisting}>`,
            to: [email],
            subject: "You've been invited to Todd's Admin",
            html: `
              <h1>Welcome to Todd's Sporting Goods Admin</h1>
              <p>Hi ${first_name},</p>
              <p>You've been invited as a <strong>${staff_role}</strong> to the Todd's admin panel.</p>
              <p>Your login credentials:</p>
              <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${newTempPassword}</li>
              </ul>
              <p><a href="${siteUrlExisting}/auth">Log in here</a></p>
              <p>Please change your password after your first login.</p>
            `,
          });
        }

        return new Response(JSON.stringify({ success: true, userId: existing.id }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      throw authError;
    }

    const userId = authUser.user!.id;

    // Create employee_profile
    const { error: epError } = await supabaseAdmin
      .from("employee_profiles")
      .upsert({
        id: userId,
        email,
        first_name,
        last_name: last_name || null,
        phone: phone || null,
        role: "admin",
        staff_role,
        is_active: true,
        invite_status: "invited",
      }, { onConflict: "id" });

    if (epError) throw epError;

    // Add admin role so they can access /admin
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" }
    );

    // Send invite email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@toddssportinggoods.com";

    if (resendKey) {
      const resend = new Resend(resendKey);
      const siteUrl = Deno.env.get("SITE_URL") || "https://toddssportinggoods.com";

      await resend.emails.send({
        from: `Todd's Sporting Goods <${fromEmail}>`,
        to: [email],
        subject: "You've been invited to Todd's Admin",
        html: `
          <h1>Welcome to Todd's Sporting Goods Admin</h1>
          <p>Hi ${first_name},</p>
          <p>You've been invited as a <strong>${staff_role}</strong> to the Todd's admin panel.</p>
          <p>Your temporary login credentials:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> ${tempPassword}</li>
          </ul>
          <p><a href="${siteUrl}/auth">Log in here</a></p>
          <p>Please change your password after your first login.</p>
        `,
      });
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("invite-staff error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
