-- Permitir que entregadores aceitem (reivindiquem) pedidos pendentes com segurança
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Drivers can accept pending orders'
  ) THEN
    CREATE POLICY "Drivers can accept pending orders"
    ON public.orders
    FOR UPDATE
    USING (
      status = 'pending'::order_status
      AND driver_user_id IS NULL
      AND has_role(auth.uid(), 'driver'::app_role)
    )
    WITH CHECK (
      driver_user_id = auth.uid()
      AND status = 'accepted'::order_status
    );
  END IF;
END
$$;

-- Trava regras de atualização para evitar que clientes alterem campos sensíveis
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
    -- finalizar entrega (accepted -> driver_completed)
    IF OLD.status = 'accepted'::order_status AND NEW.status = 'driver_completed'::order_status THEN
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

-- Melhor payload de realtime em updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Garantir que tabelas estejam publicadas para eventos em tempo real (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;