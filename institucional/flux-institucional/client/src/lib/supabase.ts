import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const supabaseKeyForClient = (supabaseAnonKey ?? supabasePublishableKey) as string | undefined;

const resolvedSupabaseUrl = supabaseUrl ?? "";
const resolvedSupabaseAnonKey = supabaseAnonKey ?? "";

if (!supabaseUrl || !supabaseKeyForClient) {
  // Keep it as a runtime error to avoid silently breaking checkout.
  // Vite env vars are required for institutional checkout/login.
  // eslint-disable-next-line no-console
  console.warn(
    "[institucional] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseKeyForClient ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Re-export for callers that need to validate env.
export const SUPABASE_URL = resolvedSupabaseUrl;
export const SUPABASE_ANON_KEY = resolvedSupabaseAnonKey;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  // Best-effort decode for debugging; does NOT validate signatures.
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }) as Promise<T>;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await withTimeout(supabase.auth.getSession(), 10000, "auth_session_timeout");
  return data.session?.access_token ?? null;
}

async function readResponsePayload(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    try {
      const text = await res.text();
      return text ? { message: text } : null;
    } catch {
      return null;
    }
  }
}

export async function signInWithGoogle() {
  // Mantém login dentro do institucional. Precisa estar em Redirect URLs do Supabase Auth.
  const redirectTo = `${window.location.origin}/login`;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function createStripeCheckout(planKey: string) {
  // Global guard to avoid any scenario where callers get stuck in "Processando...".
  return withTimeout(
    (async () => {
      console.log("[createStripeCheckout] Iniciando com planKey:", planKey);

      // IMPORTANT:
      // Supabase Edge Functions gateway expects `apikey` to be a JWT-like project key (anon or service_role).
      // `sb_publishable_*` is NOT a JWT and will cause 401 "Invalid JWT" at the gateway.
      if (!supabaseUrl) {
        console.error("[createStripeCheckout] Supabase URL missing");
        throw new Error("missing_supabase_url");
      }

      if (!supabaseAnonKey) {
        const hasPublishable = !!supabasePublishableKey;
        console.error("[createStripeCheckout] Missing VITE_SUPABASE_ANON_KEY", {
          hasPublishable,
          publishablePrefix: supabasePublishableKey ? supabasePublishableKey.slice(0, 14) : null,
        });
        throw new Error(hasPublishable ? "missing_supabase_anon_key_for_functions" : "missing_supabase_env");
      }

      console.log("[createStripeCheckout] Using apikey: anon (jwt)");

      const tryRequest = async (token: string) => {
        const url = `${supabaseUrl}/functions/v1/create-stripe-checkout`;
        console.log("[createStripeCheckout] URL da Edge Function:", url);

        const controller = new AbortController();
        const timeoutMs = 20000;
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

        try {
          console.log("[createStripeCheckout] Fazendo POST para Edge Function...");
          return await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
              // Some gateways/proxies can be picky; use a stable lower-case header name.
              authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
            body: JSON.stringify({
              planKey,
              // Keep user on the SAME origin after Checkout.
              // This prevents issues between iflux.space vs www.iflux.space (sessions are per-host).
              // The app can be opened manually from the profile menu.
              successUrl: `${window.location.origin}/?checkout=success#planos`,
              cancelUrl: `${window.location.origin}/#planos`,
            }),
          });
        } catch (e) {
          console.error("[createStripeCheckout] Erro no fetch:", e);
          if (e instanceof DOMException && e.name === "AbortError") {
            throw new Error("checkout_timeout");
          }
          throw e;
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      // Prefer the current access token (fast path). Only refresh if needed.
      let token: string | null = null;
      try {
        token = await getAccessToken();
      } catch (e) {
        console.warn(
          "[createStripeCheckout] getSession/token falhou (vai tentar refresh):",
          e instanceof Error ? e.message : String(e),
        );
      }

      if (token) {
        console.log("[createStripeCheckout] Token atual encontrado (sem refresh): SIM (" + token.slice(0, 20) + "...)");
        const payload = decodeJwtPayload(token);
        if (payload) {
          const exp = typeof payload.exp === "number" ? new Date(payload.exp * 1000).toISOString() : null;
          const aud = typeof payload.aud === "string" ? payload.aud : null;
          const iss = typeof payload.iss === "string" ? payload.iss : null;
          const role = typeof payload.role === "string" ? payload.role : null;
          const sub = typeof payload.sub === "string" ? payload.sub : null;
          console.log("[createStripeCheckout] Token debug:", {
            aud,
            iss,
            role,
            sub: sub ? sub.slice(0, 8) + "…" : null,
            exp,
          });
        }
      } else {
        console.log("[createStripeCheckout] Sem token atual. Tentando refresh (timeout 20s)...");
        try {
          await withTimeout(supabase.auth.refreshSession(), 20000, "auth_refresh_timeout");
          console.log("[createStripeCheckout] Session refreshed OK");
        } catch (e) {
          console.error(
            "[createStripeCheckout] Refresh falhou:",
            e instanceof Error ? e.message : String(e),
          );
          // Keep going: sometimes we still have a usable token even if refresh hangs.
        }

        try {
          token = await getAccessToken();
        } catch (e) {
          console.warn(
            "[createStripeCheckout] getSession/token pós-refresh falhou:",
            e instanceof Error ? e.message : String(e),
          );
        }

        console.log("[createStripeCheckout] Token obtido após refresh:", token ? "SIM (" + token.slice(0,20) + "...)" : "NÃO");

        if (token) {
          const payload = decodeJwtPayload(token);
          if (payload) {
            const exp = typeof payload.exp === "number" ? new Date(payload.exp * 1000).toISOString() : null;
            const aud = typeof payload.aud === "string" ? payload.aud : null;
            const iss = typeof payload.iss === "string" ? payload.iss : null;
            const role = typeof payload.role === "string" ? payload.role : null;
            const sub = typeof payload.sub === "string" ? payload.sub : null;
            console.log("[createStripeCheckout] Token debug (pós-refresh):", {
              aud,
              iss,
              role,
              sub: sub ? sub.slice(0, 8) + "…" : null,
              exp,
            });
          }
        }
      }

      if (!token) throw new Error("not_authenticated");

      console.log("[createStripeCheckout] Primeira tentativa...");
      let res = await tryRequest(token);
      console.log("[createStripeCheckout] Resposta status:", res.status);

      if (res.status === 401) {
        console.log("[createStripeCheckout] 401, tentando refresh (timeout 20s)...");
        try {
          await withTimeout(supabase.auth.refreshSession(), 20000, "auth_refresh_timeout");
          console.log("[createStripeCheckout] Refresh OK após 401");
          token = await getAccessToken();
          if (token) {
            console.log("[createStripeCheckout] Retry com novo token...");
            res = await tryRequest(token);
            console.log("[createStripeCheckout] Resposta retry status:", res.status);
          }
        } catch {
          // ignore e cai no erro normal
        }
      }

      const payload = await withTimeout(readResponsePayload(res), 10000, "checkout_payload_timeout");
      console.log("[createStripeCheckout] Payload:", payload);

      if (!res.ok) {
        const message =
          (payload && (payload.error || payload.message)) || `${res.status} ${res.statusText}`;
        console.error("[createStripeCheckout] Erro:", message);
        throw new Error(String(message));
      }

      if (!payload?.success || !payload?.url) {
        console.error("[createStripeCheckout] Payload inválido:", payload);
        throw new Error(String(payload?.error ?? "checkout_failed"));
      }

      console.log("[createStripeCheckout] Checkout URL:", payload.url);
      return payload.url as string;
    })(),
    35000,
    "checkout_overall_timeout",
  );
}
