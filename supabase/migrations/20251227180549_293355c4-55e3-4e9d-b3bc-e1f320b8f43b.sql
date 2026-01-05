-- Add customer_name and customer_phone columns to order_deliveries table
-- These fields store the customer info directly for SMS/WhatsApp notifications
ALTER TABLE public.order_deliveries 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Add RLS policy for companies to update their own order deliveries
CREATE POLICY "Companies can update own order deliveries" 
ON public.order_deliveries 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_deliveries.order_id 
  AND orders.company_user_id = auth.uid()
));

-- Also allow service role to update order_deliveries (for edge functions)
-- This is handled automatically by Supabase service role bypassing RLS