-- Fix trigger hardening for order_deliveries + enforce single active order per driver
--
-- Why: previous trigger used SECURITY DEFINER + current_user check, which can bypass client restrictions.
-- This migration:
-- 1) Adds an explicit "internal" bypass flag for trusted RPC updates.
-- 2) Fixes order_deliveries trigger to correctly detect anon/authenticated callers.
-- 3) Updates validate_delivery_code RPC to set the internal flag so its own updates are allowed.
-- 4) Extends enforce_orders_update_rules to block accepting a new order when driver already has an active one.

-- ============================================================================
-- 1) Secure delivery-code validation RPC (add internal bypass)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_delivery_code(
  p_delivery_id UUID,
  p_code TEXT,
  p_driver_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_hash TEXT;
  v_stored_hash TEXT;
  v_order_id UUID;
  v_driver_id UUID;
  v_attempts INTEGER;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Ensure caller is an authenticated driver
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(auth.uid(), 'driver'::app_role) THEN
    RAISE EXCEPTION 'Only drivers can validate deliveries';
  END IF;

  -- Mark this transaction as internal so security triggers can allow controlled updates.
  PERFORM set_config('flux.internal', '1', true);

  -- Lock row to avoid concurrent attempts racing
  SELECT od.code_hash, od.order_id, o.driver_user_id, od.validation_attempts
  INTO v_stored_hash, v_order_id, v_driver_id, v_attempts
  FROM public.order_deliveries od
  JOIN public.orders o ON o.id = od.order_id
  WHERE od.id = p_delivery_id
  FOR UPDATE;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF v_stored_hash IS NULL THEN
    RAISE EXCEPTION 'Delivery not found or no code set';
  END IF;

  -- Authenticated driver must match the order assignment
  IF v_driver_id IS NULL OR v_driver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Driver not assigned to this order';
  END IF;

  -- Already validated?
  IF EXISTS (
    SELECT 1
    FROM public.order_deliveries
    WHERE id = p_delivery_id AND validated_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Delivery already validated';
  END IF;

  -- Max attempts
  IF v_attempts >= 5 THEN
    RAISE EXCEPTION 'Maximum validation attempts exceeded';
  END IF;

  v_code_hash := public.hash_delivery_code(upper(trim(p_code)));
  v_success := (v_code_hash = v_stored_hash);

  -- Always log the attempt (no IP/UA available at DB level)
  INSERT INTO public.delivery_audit_logs (
    delivery_id,
    driver_user_id,
    attempted_code,
    success
  ) VALUES (
    p_delivery_id,
    auth.uid(),
    upper(trim(p_code)),
    v_success
  );

  -- Increment attempts counter
  UPDATE public.order_deliveries
  SET validation_attempts = validation_attempts + 1
  WHERE id = p_delivery_id;

  IF v_success THEN
    UPDATE public.order_deliveries
    SET validated_at = now()
    WHERE id = p_delivery_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================================================
-- 2) Prevent direct client updates to anti-fraud columns (fixed caller detection)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_order_deliveries_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Allow trusted internal updates (RPC-controlled)
  IF current_setting('flux.internal', true) = '1' THEN
    RETURN NEW;
  END IF;

  -- Detect JWT role from the request (more reliable than current_user under SECURITY DEFINER)
  v_role := COALESCE(current_setting('request.jwt.claim.role', true), auth.role(), '');

  -- Allow privileged / non-client contexts (service_role, postgres, background jobs)
  IF v_role NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- Block direct mutations of security-sensitive columns from clients
  IF NEW.code_hash IS DISTINCT FROM OLD.code_hash THEN
    RAISE EXCEPTION 'code_hash cannot be changed from client';
  END IF;

  IF NEW.delivery_code IS DISTINCT FROM OLD.delivery_code THEN
    RAISE EXCEPTION 'delivery_code cannot be changed from client';
  END IF;

  IF NEW.code_sent_at IS DISTINCT FROM OLD.code_sent_at THEN
    RAISE EXCEPTION 'code_sent_at cannot be changed from client';
  END IF;

  IF NEW.validated_at IS DISTINCT FROM OLD.validated_at THEN
    RAISE EXCEPTION 'validated_at cannot be changed from client';
  END IF;

  IF NEW.validation_attempts IS DISTINCT FROM OLD.validation_attempts THEN
    RAISE EXCEPTION 'validation_attempts cannot be changed from client';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'enforce_order_deliveries_update_rules'
  ) THEN
    CREATE TRIGGER enforce_order_deliveries_update_rules
    BEFORE UPDATE ON public.order_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_order_deliveries_update_rules();
  END IF;
END
$$;

-- ============================================================================
-- 3) Enforce single active order per driver on accept (DB-level)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_orders_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin pode tudo
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Campos que não devem ser alterados via cliente
  IF NEW.company_user_id IS DISTINCT FROM OLD.company_user_id THEN
    RAISE EXCEPTION 'company_user_id cannot be changed';
  END IF;

  IF NEW.total_value IS DISTINCT FROM OLD.total_value THEN
    RAISE EXCEPTION 'total_value cannot be changed';
  END IF;

  -- driver_user_id: só pode ser setado ao aceitar um pedido pendente (NULL -> auth.uid)
  IF NEW.driver_user_id IS DISTINCT FROM OLD.driver_user_id THEN
    IF NOT (
      OLD.driver_user_id IS NULL
      AND NEW.driver_user_id = auth.uid()
      AND OLD.status = 'pending'::order_status
      AND NEW.status = 'accepted'::order_status
      AND has_role(auth.uid(), 'driver'::app_role)
    ) THEN
      RAISE EXCEPTION 'driver_user_id cannot be changed';
    END IF;

    -- Also enforce: driver can only have one active order at a time.
    IF EXISTS (
      SELECT 1
      FROM public.orders o2
      WHERE o2.driver_user_id = auth.uid()
        AND o2.id <> OLD.id
        AND o2.status IN ('accepted'::order_status, 'driver_completed'::order_status)
    ) THEN
      RAISE EXCEPTION 'Finalize sua entrega atual antes de aceitar outro pedido';
    END IF;
  END IF;

  -- Regras de transição de status por papel
  IF has_role(auth.uid(), 'company'::app_role) AND OLD.company_user_id = auth.uid() THEN
    -- cancelar (pending -> cancelled)
    IF OLD.status = 'pending'::order_status AND NEW.status = 'cancelled'::order_status THEN
      RETURN NEW;
    END IF;

    -- confirmar entrega (driver_completed -> completed)
    IF OLD.status = 'driver_completed'::order_status AND NEW.status = 'completed'::order_status THEN
      RETURN NEW;
    END IF;

    -- permitir atualização sem troca de status (ex: updated_at)
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid status transition for company';
  END IF;

  IF has_role(auth.uid(), 'driver'::app_role) AND OLD.driver_user_id = auth.uid() THEN
    -- finalizar entrega (accepted -> driver_completed) - requires all deliveries validated
    IF OLD.status = 'accepted'::order_status AND NEW.status = 'driver_completed'::order_status THEN
      IF EXISTS (
        SELECT 1
        FROM public.order_deliveries od
        WHERE od.order_id = OLD.id
          AND od.validated_at IS NULL
      ) THEN
        RAISE EXCEPTION 'All deliveries must be validated before completing the order';
      END IF;

      RETURN NEW;
    END IF;

    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid status transition for driver';
  END IF;

  -- Caso especial: driver aceitando pedido (já validado no bloco driver_user_id)
  IF has_role(auth.uid(), 'driver'::app_role)
     AND OLD.status = 'pending'::order_status
     AND OLD.driver_user_id IS NULL
     AND NEW.status = 'accepted'::order_status
     AND NEW.driver_user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update order';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'enforce_orders_update_rules'
  ) THEN
    CREATE TRIGGER enforce_orders_update_rules
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_orders_update_rules();
  END IF;
END
$$;
