-- Enable realtime payload completeness for updates
ALTER TABLE public.order_deliveries REPLICA IDENTITY FULL;

-- Ensure delivery code updates propagate to clients (used by Códigos de Entrega screen)
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_deliveries;