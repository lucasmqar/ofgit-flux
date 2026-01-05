-- Fix billing_events schema drift
-- Some environments may already have a public.billing_events table created earlier with a different structure.
-- The webhook relies on these columns for idempotency + fulfillment.

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS plan_key TEXT;

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS raw JSONB;

-- Ensure webhook idempotency works even if the column was added later.
-- Use a partial unique index to avoid issues with existing NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS billing_events_stripe_event_id_uq
  ON public.billing_events (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;
