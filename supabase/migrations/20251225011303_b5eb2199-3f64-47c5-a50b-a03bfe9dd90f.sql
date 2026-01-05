-- FIX 1: Restrict profiles table - only allow viewing own profile or profiles with business relationship
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

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

-- FIX 2: Auto-assign role on user creation via trigger
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

-- FIX 3: Add database constraints for order_deliveries input validation
ALTER TABLE public.order_deliveries
  ADD CONSTRAINT pickup_address_length CHECK (length(pickup_address) >= 5 AND length(pickup_address) <= 500),
  ADD CONSTRAINT dropoff_address_length CHECK (length(dropoff_address) >= 5 AND length(dropoff_address) <= 500),
  ADD CONSTRAINT notes_length CHECK (notes IS NULL OR length(notes) <= 500),
  ADD CONSTRAINT suggested_price_range CHECK (suggested_price >= 0 AND suggested_price <= 10000);

-- Add constraint for orders total_value
ALTER TABLE public.orders
  ADD CONSTRAINT total_value_range CHECK (total_value >= 0 AND total_value <= 100000);