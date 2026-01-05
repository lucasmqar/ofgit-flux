/*
  Minimal Auth + Checkout bridge for the institutional site (https://iflux.space)

  What this script does:
  - Uses Supabase Auth (Google / email) to identify the user
  - When user clicks an "ASSINAR" button, it calls the Supabase Edge Function
    `create-stripe-checkout` with { planKey }
  - Redirects the browser to Stripe Checkout

  Requirements:
  1) On your institutional HTML, add `data-plan-key` to each ASSINAR button.
     Example:
       <button class="..." data-plan-key="company_30d">ASSINAR</button>

     Plan keys (must match `public.billing_plans.key`):
       company_15d | company_30d | company_90d | company_180d
       driver_15d  | driver_30d  | driver_90d  | driver_180d

  2) Set SUPABASE_URL + SUPABASE_ANON_KEY below.

  3) In Supabase Dashboard > Auth > URL Configuration:
     - Add https://iflux.space as a Site URL / Redirect URL (depending on your setup)

  4) Your Edge Functions must be deployed:
     - create-stripe-checkout

  Notes:
  - This script intentionally does NOT show extra UI; it only prompts login when needed.
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "__SUPABASE_URL__"; // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__"; // anon public key

if (SUPABASE_URL.includes("__SUPABASE_URL__") || SUPABASE_ANON_KEY.includes("__SUPABASE_ANON_KEY__")) {
  console.warn("[iflux] Configure SUPABASE_URL and SUPABASE_ANON_KEY in institutional_auth_and_checkout.js");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

async function requireSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;

  // Minimal login path: Google OAuth
  // If you want email/password on the website, you can build a small form and call signInWithPassword.
  const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.hash || "#planos"}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) throw error;

  // OAuth will redirect; this return is just to satisfy TS.
  throw new Error("Redirecting to login...");
}

async function startCheckout(planKey: string) {
  const accessToken = await requireSession();

  const fnUrl = `${SUPABASE_URL}/functions/v1/create-stripe-checkout`;

  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      planKey,
      successUrl: "https://app.iflux.space/creditos?checkout=success",
      cancelUrl: "https://iflux.space/#planos",
    }),
  });

  const json = await res.json();
  if (!res.ok || !json?.success || !json?.url) {
    console.error("[iflux] checkout error", json);
    alert(json?.error ?? "Falha ao iniciar pagamento");
    return;
  }

  window.location.href = json.url;
}

function wireButtons() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>("[data-plan-key]"));
  if (!buttons.length) {
    console.warn("[iflux] No buttons found with [data-plan-key]. Add data-plan-key to ASSINAR buttons.");
    return;
  }

  for (const btn of buttons) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const planKey = btn.getAttribute("data-plan-key");
      if (!planKey) return;
      startCheckout(planKey).catch((err) => {
        console.error("[iflux] startCheckout failed", err);
        alert("Falha ao autenticar/iniciar pagamento");
      });
    });
  }
}

wireButtons();
