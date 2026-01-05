-- Fix search_path for generate_delivery_code function
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

-- Fix search_path for hash_delivery_code function
CREATE OR REPLACE FUNCTION public.hash_delivery_code(code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT encode(sha256(code::bytea), 'hex');
$$;