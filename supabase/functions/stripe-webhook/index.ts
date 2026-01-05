import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function insertBillingEvent(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  event: any;
}): Promise<{ ok: true } | { ok: false; error: any; attempts?: any[] }> {
  const { supabaseAdmin, event } = params;

  const nowIso = new Date().toISOString();
  const eventId = String(event.id ?? "");
  const eventType = String(event.type ?? "");

  const attempts: Array<{ label: string; row: Record<string, unknown> }> = [
    // Legacy schema (observed in prod):
    // - id BIGINT (serial) => do NOT provide id
    // - provider TEXT (often 'stripe')
    // - event_id TEXT
    // - event_type TEXT NOT NULL
    {
      label: "legacy_provider_event_id_event_type_full",
      row: {
        provider: "stripe",
        event_id: eventId,
        event_type: eventType,
        stripe_event_id: eventId,
        type: eventType,
        processed_at: nowIso,
        raw: event as any,
      },
    },
    {
      label: "legacy_provider_event_id_event_type_minimal",
      row: {
        provider: "stripe",
        event_id: eventId,
        event_type: eventType,
        stripe_event_id: eventId,
        type: eventType,
        processed_at: nowIso,
      },
    },

    // Newer schema variants (keep compatibility)
    // Some schemas use event_id (TEXT) for Stripe event id and require NOT NULL.
    {
      label: "full_event_id_text",
      row: {
        event_id: eventId,
        stripe_event_id: eventId,
        type: eventType,
        event_type: eventType,
        processed_at: nowIso,
        raw: event as any,
      },
    },
    // If event_id is UUID, the above will fail; use a generated UUID.
    {
      label: "full_event_id_uuid",
      row: {
        event_id: crypto.randomUUID(),
        stripe_event_id: eventId,
        type: eventType,
        event_type: eventType,
        processed_at: nowIso,
        raw: event as any,
      },
    },
    // If raw column type differs, retry without raw.
    {
      label: "minimal_event_id_text",
      row: {
        event_id: eventId,
        stripe_event_id: eventId,
        type: eventType,
        event_type: eventType,
        processed_at: nowIso,
      },
    },
    {
      label: "minimal_event_id_uuid",
      row: {
        event_id: crypto.randomUUID(),
        stripe_event_id: eventId,
        type: eventType,
        event_type: eventType,
        processed_at: nowIso,
      },
    },

    // Last-resort: try only legacy-required columns (no stripe_event_id/type columns)
    {
      label: "legacy_only_required_with_raw",
      row: {
        provider: "stripe",
        event_id: eventId,
        event_type: eventType,
        raw: event as any,
      },
    },
    {
      label: "legacy_only_required_minimal",
      row: {
        provider: "stripe",
        event_id: eventId,
        event_type: eventType,
      },
    },
  ];

  const attemptErrors: any[] = [];

  for (const attempt of attempts) {
    const { error } = await supabaseAdmin.from("billing_events").insert(attempt.row);
    if (!error) return { ok: true };

    // Unique violation: already recorded by another attempt/process.
    if ((error as any).code === "23505") return { ok: true };

    // Keep trying other shapes for schema drift issues.
    const code = String((error as any).code ?? "");
    const message = String((error as any).message ?? "");
    attemptErrors.push({
      attempt: attempt.label,
      code: code || undefined,
      message: message || undefined,
      details: (error as any).details ?? undefined,
      hint: (error as any).hint ?? undefined,
    });

    // If this looks like a hard failure unrelated to schema drift, return immediately.
    // Example: permission denied, missing table.
    if (code === "42501" || message.toLowerCase().includes("permission denied")) {
      return { ok: false, error: { ...error, attempt: attempt.label }, attempts: attemptErrors };
    }
  }

  return {
    ok: false,
    error: { code: "insert_failed", message: "All insert attempts failed" },
    attempts: attemptErrors,
  };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(new Uint8Array(sig));
}

async function verifyStripeSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
  toleranceSeconds: number;
}): Promise<{ ok: true; timestamp: number } | { ok: false; error: string }> {
  const { rawBody, signatureHeader, webhookSecret, toleranceSeconds } = params;

  const parts = signatureHeader.split(",").map((p) => p.trim());
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1="));

  if (!timestampPart || v1Parts.length === 0) {
    return { ok: false, error: "Invalid stripe-signature header" };
  }

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return { ok: false, error: "Invalid signature timestamp" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, error: "Signature timestamp outside tolerance" };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = await hmacSha256Hex(webhookSecret, signedPayload);
  const provided = v1Parts.map((p) => p.slice(3));
  const matched = provided.some((sig) => safeEqual(sig, expected));

  if (!matched) return { ok: false, error: "Invalid signature" };
  return { ok: true, timestamp };
}

async function extendCreditsForUser(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  durationDays: number;
}) {
  const { supabaseAdmin, userId, durationDays } = params;

  const now = new Date();

  const { data: existingCredits, error: existingCreditsError } = await supabaseAdmin
    .from("credits")
    .select("valid_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingCreditsError && existingCreditsError.code !== "PGRST116") {
    throw existingCreditsError;
  }

  const currentValidUntil = existingCredits?.valid_until ? new Date(existingCredits.valid_until) : null;
  const base = currentValidUntil && currentValidUntil > now ? currentValidUntil : now;
  const nextValidUntil = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);

  if (existingCredits) {
    const { error: updateError } = await supabaseAdmin
      .from("credits")
      .update({ valid_until: nextValidUntil.toISOString() })
      .eq("user_id", userId);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("credits")
      .insert({ user_id: userId, valid_until: nextValidUntil.toISOString() });

    if (insertError) throw insertError;
  }

  return { nextValidUntil: nextValidUntil.toISOString() };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
    if (!stripeWebhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

    const signature = req.headers.get("stripe-signature");
    if (!signature) return json(400, { success: false, error: "Missing stripe-signature header" });

    const rawBody = await req.text();

    const toleranceSeconds = Number(Deno.env.get("STRIPE_WEBHOOK_TOLERANCE_SECONDS") ?? "300");
    const verified = await verifyStripeSignature({
      rawBody,
      signatureHeader: signature,
      webhookSecret: stripeWebhookSecret,
      toleranceSeconds: Number.isFinite(toleranceSeconds) ? toleranceSeconds : 300,
    });

    if (!verified.ok) {
      console.error("Stripe signature verification failed:", verified.error);
      return json(400, { success: false, error: verified.error });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      console.error("Invalid JSON payload:", err);
      return json(400, { success: false, error: "Invalid JSON payload" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Idempotency: if already processed, return 200.
    const { data: existingEvent, error: existingEventError } = await supabaseAdmin
      .from("billing_events")
      .select("stripe_event_id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEventError && existingEventError.code !== "PGRST116") {
      console.error("Error checking billing_events:", existingEventError);

      const message = String((existingEventError as any).message ?? "");
      const code = String((existingEventError as any).code ?? "");

      const lower = message.toLowerCase();

      // Common production issues: migrations not applied OR schema drift (table exists but columns differ).
      if (lower.includes("billing_events") && lower.includes("does not exist")) {
        if (lower.includes("column") && lower.includes("stripe_event_id")) {
          return json(500, {
            success: false,
            error:
              "Billing schema drift: public.billing_events exists but is missing stripe_event_id. Apply the latest billing migration or ALTER TABLE to add required columns.",
          });
        }

        if (lower.includes("relation") || lower.includes("table")) {
          return json(500, {
            success: false,
            error: "Billing tables not installed (public.billing_events missing). Run Supabase migrations.",
          });
        }
      }

      return json(500, {
        success: false,
        error: "Failed to check idempotency",
        code: code || undefined,
      });
    }

    if (existingEvent) {
      return json(200, { success: true, alreadyProcessed: true });
    }

    // Record first (best-effort); if we crash after, idempotency still holds.
    const insertRes = await insertBillingEvent({ supabaseAdmin, event });
    if (!insertRes.ok) {
      const code = String((insertRes.error as any)?.code ?? "");
      const message = String((insertRes.error as any)?.message ?? "");
      return json(500, {
        success: false,
        error: "Failed to record billing event",
        code: code || undefined,
        message: message || undefined,
        attempts: (insertRes as any).attempts ?? undefined,
      });
    }

    const paidTypes = new Set([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ]);

    if (!paidTypes.has(event.type)) {
      return json(200, { success: true, ignored: true, type: event.type });
    }

    const session = event.data?.object as any;

    const paymentStatus = session.payment_status;
    const isPaid = paymentStatus === "paid";

    // For async events, payment_status should be paid, but keep guard anyway.
    if (!isPaid) {
      return json(200, { success: true, ignored: true, reason: "payment_status_not_paid", payment_status: paymentStatus });
    }

    const userId = (session.metadata?.supabase_user_id ?? session.client_reference_id ?? "").toString();
    const planKey = (session.metadata?.plan_key ?? "").toString();

    if (!userId || !planKey) {
      console.error("Missing metadata for fulfillment", { userId, planKey });
      return json(400, { success: false, error: "Missing fulfillment metadata" });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("billing_plans")
      .select("key, duration_days")
      .eq("key", planKey)
      .maybeSingle();

    if (planError) {
      console.error("Error loading plan:", planError);
      return json(500, { success: false, error: "Failed to load plan" });
    }

    if (!plan) return json(400, { success: false, error: "Unknown plan" });

    const durationDays = Number(plan.duration_days);
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return json(400, { success: false, error: "Invalid plan duration" });
    }

    const { nextValidUntil } = await extendCreditsForUser({
      supabaseAdmin,
      userId,
      durationDays,
    });

    // Attach user/plan to the billing_events row we already inserted (best-effort)
    await supabaseAdmin
      .from("billing_events")
      .update({ user_id: userId, plan_key: planKey })
      .eq("stripe_event_id", event.id);

    return json(200, { success: true, userId, planKey, nextValidUntil });
  } catch (error) {
    console.error("Error in stripe-webhook:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
