-- Allow authenticated users to set their own role once (company/driver) after OAuth sign-in

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
