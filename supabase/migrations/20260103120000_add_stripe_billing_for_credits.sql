-- Stripe billing support for "credits" (access validity)
-- Adds plan catalog + Stripe customer mapping + webhook idempotency log

CREATE TABLE IF NOT EXISTS public.billing_plans (
  key TEXT PRIMARY KEY,
  role public.app_role NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'brl',
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_key TEXT REFERENCES public.billing_plans(key) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw JSONB
);

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Public can read plans (safe: only exposes what you already show on the website)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_plans'
      AND policyname = 'Anyone can view billing plans'
  ) THEN
    CREATE POLICY "Anyone can view billing plans"
      ON public.billing_plans
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Only admins can manage plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_plans'
      AND policyname = 'Only admins can manage billing plans'
  ) THEN
    CREATE POLICY "Only admins can manage billing plans"
      ON public.billing_plans
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Users can view their Stripe customer mapping; only admins can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_customers'
      AND policyname = 'Users can view own billing customer'
  ) THEN
    CREATE POLICY "Users can view own billing customer"
      ON public.billing_customers
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_customers'
      AND policyname = 'Only admins can manage billing customers'
  ) THEN
    CREATE POLICY "Only admins can manage billing customers"
      ON public.billing_customers
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Billing events should be admin-only (webhook/service role writes anyway)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_events'
      AND policyname = 'Only admins can view billing events'
  ) THEN
    CREATE POLICY "Only admins can view billing events"
      ON public.billing_events
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_events'
      AND policyname = 'Only admins can manage billing events'
  ) THEN
    CREATE POLICY "Only admins can manage billing events"
      ON public.billing_events
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- updated_at triggers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_billing_plans_updated_at') THEN
      CREATE TRIGGER update_billing_plans_updated_at
        BEFORE UPDATE ON public.billing_plans
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_billing_customers_updated_at') THEN
      CREATE TRIGGER update_billing_customers_updated_at
        BEFORE UPDATE ON public.billing_customers
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

-- Seed default plans (Stripe price ids can be filled later)
INSERT INTO public.billing_plans (key, role, duration_days, amount_cents, currency, stripe_price_id, active)
VALUES
  ('company_15d', 'company', 15, 18990, 'brl', NULL, true),
  ('company_30d', 'company', 30, 38990, 'brl', NULL, true),
  ('company_90d', 'company', 90, 99990, 'brl', NULL, true),
  ('company_180d', 'company', 180, 199990, 'brl', NULL, true),
  ('driver_15d', 'driver', 15, 8990, 'brl', NULL, true),
  ('driver_30d', 'driver', 30, 16990, 'brl', NULL, true),
  ('driver_90d', 'driver', 90, 48990, 'brl', NULL, true),
  ('driver_180d', 'driver', 180, 89990, 'brl', NULL, true)
ON CONFLICT (key) DO UPDATE SET
  role = EXCLUDED.role,
  duration_days = EXCLUDED.duration_days,
  amount_cents = EXCLUDED.amount_cents,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active,
  stripe_price_id = COALESCE(public.billing_plans.stripe_price_id, EXCLUDED.stripe_price_id),
  updated_at = now();
