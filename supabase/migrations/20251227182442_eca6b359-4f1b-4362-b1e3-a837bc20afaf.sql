-- Add column to store the original code for company visibility
ALTER TABLE public.order_deliveries 
ADD COLUMN IF NOT EXISTS delivery_code TEXT;

-- Add RLS policy for drivers to update delivery code fields
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