-- DANGER: Destructive reset (production)
-- Resets ALL orders and deletes ALL users except admins.
-- Intended for Supabase Postgres. Run in Supabase Dashboard -> SQL Editor as a privileged role.
--
-- What it does:
-- 1) Deletes all rows from public.orders (cascades to deliveries, ratings, audit logs, payments linked by order_id)
-- 2) Deletes payment_history rows that involve any non-admin user (this table has no FKs)
-- 3) Deletes all auth.users that are NOT admins (cascades to profiles, roles, company/driver profiles, credits, notifications, tokens, etc.)
--
-- Admin detection:
-- Uses public.user_roles where role = 'admin'. If no admins are found, the script aborts.

BEGIN;

-- Collect admin user IDs
CREATE TEMP TABLE _admin_ids (id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _admin_ids (id)
SELECT DISTINCT ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'admin'::app_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _admin_ids) THEN
    RAISE EXCEPTION 'ABORT: No admin users found in public.user_roles (role=admin).';
  END IF;
END $$;

-- Optional visibility (counts)
-- SELECT (SELECT COUNT(*) FROM public.orders) AS orders_before,
--        (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM _admin_ids)) AS users_to_delete_before;

-- 1) Reset all orders (this also clears: order_deliveries, ratings by order_id, delivery_audit_logs, order_payments)
DELETE FROM public.orders;

-- 2) payment_history has no FKs: remove rows tied to any non-admin user
DELETE FROM public.payment_history ph
WHERE NOT (
  ph.driver_user_id IN (SELECT id FROM _admin_ids)
  AND ph.company_user_id IN (SELECT id FROM _admin_ids)
);

-- 3) Delete all non-admin auth users (cascades to public.* tables with FK to auth.users)
DELETE FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM _admin_ids);

COMMIT;

-- Optional visibility (counts)
-- SELECT (SELECT COUNT(*) FROM public.orders) AS orders_after,
--        (SELECT COUNT(*) FROM auth.users) AS users_after,
--        (SELECT COUNT(*) FROM public.payment_history) AS payment_history_after;
