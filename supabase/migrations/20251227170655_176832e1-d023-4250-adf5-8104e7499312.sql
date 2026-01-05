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