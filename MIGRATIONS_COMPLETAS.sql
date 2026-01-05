-- ============================================================================
-- FLUX - MIGRATIONS COMPLETAS
-- Execute este arquivo inteiro no Supabase SQL Editor
-- Copie tudo abaixo e cole no: https://app.supabase.com > SQL Editor
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Fase 1-4 - Criar tipos, tabelas, RLS e triggers
-- ============================================================================

-- Fase 1: Criar tipos ENUM
CREATE TYPE public.app_role AS ENUM ('admin', 'company', 'driver');
CREATE TYPE public.order_status AS ENUM ('pending', 'accepted', 'driver_completed', 'completed', 'cancelled');
CREATE TYPE public.package_type AS ENUM ('envelope', 'bag', 'small_box', 'large_box', 'other');
CREATE TYPE public.vehicle_type AS ENUM ('moto', 'car', 'bike');
CREATE TYPE public.notification_tag AS ENUM ('deliveries', 'credits', 'account');

-- Fase 2: Tabela de perfis (users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles (separada por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Tabela de perfis de empresa
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT NOT NULL,
  address_default TEXT,
  cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de perfis de entregador
CREATE TABLE public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  vehicle_type vehicle_type NOT NULL,
  vehicle_model TEXT NOT NULL,
  plate TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de créditos
CREATE TABLE public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  driver_completed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Tabela de entregas (itens do pedido)
CREATE TABLE public.order_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  package_type package_type NOT NULL,
  notes TEXT,
  suggested_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de avaliações
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag notification_tag NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de alertas admin
CREATE TABLE public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fase 3: Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Políticas para profiles
CREATE POLICY "Users can view related profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.orders 
    WHERE (orders.company_user_id = auth.uid() AND orders.driver_user_id = profiles.id)
       OR (orders.driver_user_id = auth.uid() AND orders.company_user_id = profiles.id)
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Políticas para user_roles (apenas admin pode gerenciar)
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para company_profiles
CREATE POLICY "Users can view company profiles"
  ON public.company_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Companies can update own profile"
  ON public.company_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Companies can insert own profile"
  ON public.company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para driver_profiles
CREATE POLICY "Users can view driver profiles"
  ON public.driver_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can update own profile"
  ON public.driver_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert own profile"
  ON public.driver_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para credits
CREATE POLICY "Users can view own credits"
  ON public.credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage credits"
  ON public.credits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para orders
CREATE POLICY "Companies can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = company_user_id 
    OR auth.uid() = driver_user_id 
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Drivers can view pending orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND public.has_role(auth.uid(), 'driver')
  );

CREATE POLICY "Companies can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = company_user_id AND public.has_role(auth.uid(), 'company'));

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

CREATE POLICY "Involved users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = company_user_id 
    OR auth.uid() = driver_user_id 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Políticas para order_deliveries
CREATE POLICY "Users can view order deliveries"
  ON public.order_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_deliveries.order_id
      AND (
        orders.company_user_id = auth.uid() 
        OR orders.driver_user_id = auth.uid()
        OR orders.status = 'pending'
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Companies can create order deliveries"
  ON public.order_deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_deliveries.order_id
      AND orders.company_user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update own order deliveries" 
ON public.order_deliveries 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_deliveries.order_id 
  AND orders.company_user_id = auth.uid()
));

CREATE POLICY "Drivers can update delivery codes"
ON public.order_deliveries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_deliveries.order_id 
    AND o.driver_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_deliveries.order_id 
    AND o.driver_user_id = auth.uid()
  )
);

-- Políticas para ratings
CREATE POLICY "Users can view ratings"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create ratings for their orders"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

-- Políticas para notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Políticas para admin_alerts
CREATE POLICY "Users can view own alerts"
  ON public.admin_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage alerts"
  ON public.admin_alerts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fase 4: Triggers
-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MIGRATION 2: Corrigir função update_updated_at_column com search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- MIGRATION 3: FIX - Restrict profiles, Auto-assign roles, Add constraints
-- ============================================================================

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Auto-assign role on user creation via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign role from user metadata, defaulting to 'company'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::app_role,
      'company'::app_role
    )
  );
  RETURN NEW;
END;
$$;

-- Create trigger for role assignment
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Add database constraints for order_deliveries input validation
ALTER TABLE public.order_deliveries
  ADD CONSTRAINT pickup_address_length CHECK (length(pickup_address) >= 5 AND length(pickup_address) <= 500),
  ADD CONSTRAINT dropoff_address_length CHECK (length(dropoff_address) >= 5 AND length(dropoff_address) <= 500),
  ADD CONSTRAINT notes_length CHECK (notes IS NULL OR length(notes) <= 500),
  ADD CONSTRAINT suggested_price_range CHECK (suggested_price >= 0 AND suggested_price <= 10000);

-- Add constraint for orders total_value
ALTER TABLE public.orders
  ADD CONSTRAINT total_value_range CHECK (total_value >= 0 AND total_value <= 100000);

-- ============================================================================
-- MIGRATION 4: Permitir que entregadores aceitem pedidos + enforce rules
-- ============================================================================

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

CREATE TRIGGER enforce_orders_update_rules
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_orders_update_rules();

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

-- ============================================================================
-- MIGRATION 5: Create customers table + delivery audit + codes
-- ============================================================================

-- Create customers table for final clients (CRM)
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Companies can manage their own customers
CREATE POLICY "Companies can view own customers"
ON public.customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.id = customers.company_id AND cp.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Companies can insert own customers"
ON public.customers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.id = customers.company_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Companies can update own customers"
ON public.customers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.id = customers.company_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Companies can delete own customers"
ON public.customers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.id = customers.company_id AND cp.user_id = auth.uid()
  )
);

-- Create delivery_audit_logs for tracking validation attempts
CREATE TABLE public.delivery_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.order_deliveries(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL,
  attempted_code TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on delivery_audit_logs
ALTER TABLE public.delivery_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.delivery_audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drivers can insert audit logs (for their validation attempts)
CREATE POLICY "Drivers can insert audit logs"
ON public.delivery_audit_logs FOR INSERT
WITH CHECK (driver_user_id = auth.uid() AND has_role(auth.uid(), 'driver'::app_role));

-- Add new fields to order_deliveries for anti-fraud system
ALTER TABLE public.order_deliveries
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN code_hash TEXT,
ADD COLUMN code_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN validation_attempts INTEGER NOT NULL DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX idx_order_deliveries_code_hash ON public.order_deliveries(code_hash);
CREATE INDEX idx_order_deliveries_customer_id ON public.order_deliveries(customer_id);
CREATE INDEX idx_delivery_audit_logs_delivery_id ON public.delivery_audit_logs(delivery_id);

-- Function to generate a random 6-character alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to hash a delivery code using SHA-256
CREATE OR REPLACE FUNCTION public.hash_delivery_code(code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT encode(sha256(code::bytea), 'hex');
$$;

-- Function to validate a delivery code
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
BEGIN
  -- Get the stored hash and order info
  SELECT od.code_hash, od.order_id, o.driver_user_id, od.validation_attempts
  INTO v_stored_hash, v_order_id, v_driver_id, v_attempts
  FROM public.order_deliveries od
  JOIN public.orders o ON o.id = od.order_id
  WHERE od.id = p_delivery_id;

  -- Check if delivery exists
  IF v_stored_hash IS NULL THEN
    RAISE EXCEPTION 'Delivery not found or no code set';
  END IF;

  -- Check if driver is assigned to this order
  IF v_driver_id != p_driver_user_id THEN
    RAISE EXCEPTION 'Driver not assigned to this order';
  END IF;

  -- Check if already validated
  IF EXISTS (SELECT 1 FROM public.order_deliveries WHERE id = p_delivery_id AND validated_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Delivery already validated';
  END IF;

  -- Check max attempts (5 max)
  IF v_attempts >= 5 THEN
    RAISE EXCEPTION 'Maximum validation attempts exceeded';
  END IF;

  -- Hash the provided code
  v_code_hash := public.hash_delivery_code(p_code);

  -- Increment attempts counter
  UPDATE public.order_deliveries
  SET validation_attempts = validation_attempts + 1
  WHERE id = p_delivery_id;

  -- Check if code matches
  IF v_code_hash = v_stored_hash THEN
    -- Mark as validated
    UPDATE public.order_deliveries
    SET validated_at = now()
    WHERE id = p_delivery_id;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Add updated_at trigger for customers
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_audit_logs;

-- ============================================================================
-- MIGRATION 6: Fix search_path for code generation/hashing functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_delivery_code(code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT encode(sha256(code::bytea), 'hex');
$$;

-- ============================================================================
-- MIGRATION 7: Add customer_name/phone columns to order_deliveries
-- ============================================================================

ALTER TABLE public.order_deliveries 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- ============================================================================
-- MIGRATION 8: Add delivery_code column to order_deliveries
-- ============================================================================

ALTER TABLE public.order_deliveries 
ADD COLUMN IF NOT EXISTS delivery_code TEXT;

-- ============================================================================
-- MIGRATION 9: Allow authenticated users to set their own role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_my_role(p_role public.app_role)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow self-assigning non-privileged roles
  IF p_role NOT IN ('company', 'driver') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  -- Only allow setting role once
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'role_already_set';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), p_role);

  RETURN p_role;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_role(public.app_role) TO authenticated;

-- ============================================================================
-- MIGRATION 10: Create order_payments + payment_history tables
-- ============================================================================

-- Criar tabela order_payments para rastrear pagamentos por empresa/mês
CREATE TABLE public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL,
  company_user_id UUID NOT NULL,
  payment_month TEXT NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id)
);

-- Criar índices para performance
CREATE INDEX idx_order_payments_driver ON public.order_payments(driver_user_id);
CREATE INDEX idx_order_payments_company ON public.order_payments(company_user_id);
CREATE INDEX idx_order_payments_month ON public.order_payments(payment_month);

-- Habilitar RLS
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- Política: Entregadores podem ver seus próprios registros de pagamento
CREATE POLICY "Drivers can view own payment records"
ON public.order_payments
FOR SELECT
USING (
  driver_user_id = auth.uid() 
  OR company_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Entregadores podem criar registros de pagamento para seus pedidos
CREATE POLICY "Drivers can insert payment records for their orders"
ON public.order_payments
FOR INSERT
WITH CHECK (
  driver_user_id = auth.uid() 
  AND has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND o.driver_user_id = auth.uid()
    AND o.status = 'completed'::order_status
  )
);

-- Criar tabela payment_history para histórico detalhado
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_user_id UUID NOT NULL,
  company_user_id UUID NOT NULL,
  payment_month TEXT NOT NULL,
  total_orders INTEGER NOT NULL,
  total_value NUMERIC NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para payment_history
CREATE INDEX idx_payment_history_driver ON public.payment_history(driver_user_id);
CREATE INDEX idx_payment_history_company ON public.payment_history(company_user_id);
CREATE INDEX idx_payment_history_marked_at ON public.payment_history(marked_at DESC);

-- Habilitar RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seu próprio histórico
CREATE POLICY "Users can view own payment history"
ON public.payment_history
FOR SELECT
USING (
  driver_user_id = auth.uid() 
  OR company_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Entregadores podem inserir histórico
CREATE POLICY "Drivers can insert payment history"
ON public.payment_history
FOR INSERT
WITH CHECK (
  driver_user_id = auth.uid() 
  AND has_role(auth.uid(), 'driver'::app_role)
);

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;

-- Função para criar notificação de relatório atrasado
CREATE OR REPLACE FUNCTION public.check_overdue_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver RECORD;
  v_company RECORD;
  v_overdue_date DATE;
BEGIN
  -- Data limite: 30 dias atrás
  v_overdue_date := CURRENT_DATE - INTERVAL '30 days';
  
  -- Buscar entregadores com pedidos completados há mais de 30 dias sem pagamento
  FOR v_driver IN
    SELECT DISTINCT 
      o.driver_user_id,
      o.company_user_id,
      cp.company_name,
      COUNT(*) as order_count,
      SUM(o.total_value) as total_value
    FROM public.orders o
    JOIN public.company_profiles cp ON cp.user_id = o.company_user_id
    LEFT JOIN public.order_payments op ON op.order_id = o.id
    WHERE o.status = 'completed'
      AND o.completed_at < v_overdue_date
      AND op.id IS NULL
      AND o.driver_user_id IS NOT NULL
    GROUP BY o.driver_user_id, o.company_user_id, cp.company_name
  LOOP
    -- Verificar se já existe notificação recente (últimos 7 dias)
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_driver.driver_user_id
        AND tag = 'credits'
        AND title LIKE '%Relatório Pendente%'
        AND created_at > CURRENT_DATE - INTERVAL '7 days'
    ) THEN
      -- Criar notificação para o entregador
      INSERT INTO public.notifications (user_id, tag, title, message)
      VALUES (
        v_driver.driver_user_id,
        'credits',
        'Relatório Pendente - Atenção!',
        format('Você tem %s pedido(s) da empresa %s pendentes há mais de 30 dias. Valor total: R$ %s', 
          v_driver.order_count, 
          v_driver.company_name,
          to_char(v_driver.total_value, 'FM999G999D00')
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- MIGRATION 11: Enable realtime for order_deliveries
-- ============================================================================

-- Enable realtime payload completeness for updates
ALTER TABLE public.order_deliveries REPLICA IDENTITY FULL;

-- Ensure delivery code updates propagate to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_deliveries;

-- ============================================================================
-- FIM DAS MIGRATIONS
-- ============================================================================
-- Parabéns! Todas as migrations foram aplicadas com sucesso!
-- Agora você pode:
-- 1. Criar usuário admin via Edge Function
-- 2. Testar o frontend localmente com "npm run dev"
-- ============================================================================
