-- Fix: allow OAuth users to choose role later via public.set_my_role()
--
-- Previous behavior (20251225011303): role trigger always inserted a role, defaulting to 'company'.
-- That breaks the intended flow in 20251227203230 where OAuth users can self-assign a role once.
--
-- New behavior:
-- - Only insert a role automatically if NEW.raw_user_meta_data contains a valid non-admin role.
-- - Otherwise, do not create any role row, so the user can pick later.

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_text text;
  role_value public.app_role;
BEGIN
  role_text := NEW.raw_user_meta_data->>'role';

  -- If no role was provided in metadata (common for OAuth), do nothing.
  IF role_text IS NULL OR btrim(role_text) = '' THEN
    RETURN NEW;
  END IF;

  -- Validate role value; ignore invalid inputs.
  BEGIN
    role_value := role_text::public.app_role;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  -- Only allow non-privileged roles to be auto-assigned.
  IF role_value NOT IN ('company', 'driver') THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates.
  IF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, role_value);

  RETURN NEW;
END;
$$;

-- Keep the trigger, just ensure it points to the updated function.
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
