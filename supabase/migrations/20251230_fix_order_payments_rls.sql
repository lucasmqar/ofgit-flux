-- Fix RLS for order_payments inserts when orders are still driver_completed.
-- Also ensure the company_user_id stored matches the order.

DO $$
BEGIN
  -- Drop old policy name if it exists (idempotent-ish)
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_payments'
      AND policyname = 'Drivers can insert payment records for their orders'
  ) THEN
    EXECUTE 'DROP POLICY "Drivers can insert payment records for their orders" ON public.order_payments';
  END IF;
END $$;

CREATE POLICY "Drivers can insert payment records for their orders"
ON public.order_payments
FOR INSERT
WITH CHECK (
  driver_user_id = auth.uid()
  AND has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND o.driver_user_id = auth.uid()
      AND o.company_user_id = company_user_id
      AND o.status IN ('completed'::order_status, 'driver_completed'::order_status)
  )
);
