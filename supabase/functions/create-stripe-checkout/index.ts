import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Payload = {
  planKey: string;
  successUrl?: string;
  cancelUrl?: string;
};

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedHosts = new Set(["iflux.space", "www.iflux.space", "app.iflux.space"]);
    return parsed.protocol === "https:" && allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

function parsePaymentMethodTypes(raw: string | undefined): string[] {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return ["card"]; // safest default
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatPlanName(plan: { key: string; role: string; duration_days: number }) {
  const roleLabel = plan.role === "company" ? "Empresa" : plan.role === "driver" ? "Entregador" : plan.role;
  return `Plano ${roleLabel} • ${plan.duration_days} dias`;
}

function getBearerToken(authHeader: string): string {
  const trimmed = authHeader.trim();
  if (!trimmed) return "";
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed.slice(7).trim() : trimmed;
}

async function stripePostForm(params: {
  stripeSecretKey: string;
  path: string;
  form: URLSearchParams;
}): Promise<any> {
  const { stripeSecretKey, path, form } = params;
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2023-10-16",
    },
    body: form.toString(),
  });

  const text = await res.text();
  let jsonBody: any = null;
  try {
    jsonBody = text ? JSON.parse(text) : null;
  } catch {
    jsonBody = null;
  }

  if (!res.ok) {
    const stripeMessage = jsonBody?.error?.message ?? text ?? `Stripe error (${res.status})`;
    throw new Error(stripeMessage);
  }

  return jsonBody;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) return json(401, { success: false, error: "Missing Authorization header" });

    const accessToken = getBearerToken(authHeader);
    if (!accessToken) return json(401, { success: false, error: "Missing access token" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    if (!stripeSecretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const payload = (await req.json()) as Partial<Payload>;
    const planKey = payload.planKey;

    if (!planKey) return json(400, { success: false, error: "Missing planKey" });

    const defaultSuccessUrl = "https://app.iflux.space/creditos?checkout=success";
    const defaultCancelUrl = "https://iflux.space/#planos";

    const successUrl = payload.successUrl ?? defaultSuccessUrl;
    const cancelUrl = payload.cancelUrl ?? defaultCancelUrl;

    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return json(400, { success: false, error: "Invalid successUrl/cancelUrl" });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      console.error("Auth error:", authError);
      return json(401, { success: false, error: "Unauthorized" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const userId = authData.user.id;

    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError) {
      console.error("Error fetching user role:", roleError);
      return json(500, { success: false, error: "Failed to load user role" });
    }

    const userRole = roleRow?.role as string | undefined;

    const { data: plan, error: planError } = await supabaseAdmin
      .from("billing_plans")
      .select("key, role, duration_days, stripe_price_id, active, amount_cents, currency")
      .eq("key", planKey)
      .maybeSingle();

    if (planError) {
      console.error("Error fetching billing plan:", planError);
      return json(500, { success: false, error: "Failed to load billing plan" });
    }

    if (!plan || !plan.active) return json(404, { success: false, error: "Plan not found" });
    // If stripe_price_id is missing, we can still create a Checkout Session using price_data.
    // This allows test-mode checkout without requiring manual Stripe price setup.

    // Enforce plan role = user role (admins can buy/test any plan)
    const isAdmin = userRole === "admin";
    if (!isAdmin && userRole && plan.role !== userRole) {
      return json(403, { success: false, error: "Plan does not match your role" });
    }

    // Enforce profile completeness before checkout (admins can bypass).
    if (!isAdmin) {
      const { data: baseProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, name, phone")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching base profile:", profileError);
        return json(500, { success: false, error: "Failed to load profile" });
      }

      if (!baseProfile?.name || !baseProfile?.phone) {
        return json(403, { success: false, error: "Complete your profile before checkout" });
      }

      if (plan.role === "company") {
        const { data: company, error: companyError } = await supabaseAdmin
          .from("company_profiles")
          .select("company_name, city, state, cnpj")
          .eq("user_id", userId)
          .maybeSingle();

        if (companyError) {
          console.error("Error fetching company profile:", companyError);
          return json(500, { success: false, error: "Failed to load company profile" });
        }

        if (!company?.company_name || !company?.city || !company?.state || !company?.cnpj) {
          return json(403, { success: false, error: "Complete company profile before checkout" });
        }
      }

      if (plan.role === "driver") {
        const { data: driver, error: driverError } = await supabaseAdmin
          .from("driver_profiles")
          .select("vehicle_type, vehicle_model, plate, city, state")
          .eq("user_id", userId)
          .maybeSingle();

        if (driverError) {
          console.error("Error fetching driver profile:", driverError);
          return json(500, { success: false, error: "Failed to load driver profile" });
        }

        if (!driver?.vehicle_type || !driver?.vehicle_model || !driver?.plate || !driver?.city || !driver?.state) {
          return json(403, { success: false, error: "Complete driver profile before checkout" });
        }
      }
    }

    const { data: existingCustomer, error: existingCustomerError } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingCustomerError) {
      console.error("Error fetching billing customer:", existingCustomerError);
      return json(500, { success: false, error: "Failed to load billing customer" });
    }

    let stripeCustomerId = existingCustomer?.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
      const form = new URLSearchParams();
      if (authData.user.email) form.set("email", authData.user.email);
      form.set("metadata[supabase_user_id]", userId);

      const customer = await stripePostForm({
        stripeSecretKey,
        path: "/v1/customers",
        form,
      });

      stripeCustomerId = String(customer?.id ?? "");
      if (!stripeCustomerId) return json(500, { success: false, error: "Failed to create Stripe customer" });

      const { error: upsertCustomerError } = await supabaseAdmin
        .from("billing_customers")
        .upsert({ user_id: userId, stripe_customer_id: stripeCustomerId });

      if (upsertCustomerError) {
        console.error("Error upserting billing customer:", upsertCustomerError);
        return json(500, { success: false, error: "Failed to persist billing customer" });
      }
    }

    const paymentMethodTypes = parsePaymentMethodTypes(Deno.env.get("STRIPE_PAYMENT_METHOD_TYPES") ?? undefined);

    const sessionForm = new URLSearchParams();
    sessionForm.set("mode", "payment");
    sessionForm.set("customer", stripeCustomerId);
    sessionForm.set("client_reference_id", userId);
    sessionForm.set("success_url", successUrl);
    sessionForm.set("cancel_url", cancelUrl);
    if (plan.stripe_price_id) {
      sessionForm.set("line_items[0][price]", String(plan.stripe_price_id));
      sessionForm.set("line_items[0][quantity]", "1");
    } else {
      // Fallback: price_data (no Stripe price id required)
      sessionForm.set("line_items[0][price_data][currency]", String(plan.currency ?? "brl"));
      sessionForm.set("line_items[0][price_data][unit_amount]", String(plan.amount_cents));
      sessionForm.set("line_items[0][price_data][product_data][name]", formatPlanName({
        key: String(plan.key),
        role: String(plan.role),
        duration_days: Number(plan.duration_days),
      }));
      sessionForm.set("line_items[0][quantity]", "1");
    }

    paymentMethodTypes.forEach((pm, idx) => {
      sessionForm.set(`payment_method_types[${idx}]`, pm);
    });

    sessionForm.set("metadata[supabase_user_id]", userId);
    sessionForm.set("metadata[plan_key]", String(plan.key));
    sessionForm.set("metadata[role]", String(plan.role));
    sessionForm.set("metadata[duration_days]", String(plan.duration_days));
    sessionForm.set("metadata[amount_cents]", String(plan.amount_cents));
    sessionForm.set("metadata[currency]", String(plan.currency));

    const session = await stripePostForm({
      stripeSecretKey,
      path: "/v1/checkout/sessions",
      form: sessionForm,
    });

    const url = String(session?.url ?? "");
    if (!url) return json(500, { success: false, error: "Stripe did not return a checkout URL" });
    return json(200, { success: true, url });
  } catch (error) {
    console.error("Error in create-stripe-checkout:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
