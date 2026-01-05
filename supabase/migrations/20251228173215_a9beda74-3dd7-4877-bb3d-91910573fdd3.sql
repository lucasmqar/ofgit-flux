-- Criar tabela order_payments para rastrear pagamentos por empresa/mês
CREATE TABLE public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL,
  company_user_id UUID NOT NULL,
  payment_month TEXT NOT NULL, -- formato: 'YYYY-MM'
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id) -- Um pedido só pode ser marcado como pago uma vez
);

-- Criar índices para performance
CREATE INDEX idx_order_payments_driver ON public.order_payments(driver_user_id);
CREATE INDEX idx_order_payments_company ON public.order_payments(company_user_id);
CREATE INDEX idx_order_payments_month ON public.order_payments(payment_month);

-- Habilitar RLS
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- Política: Entregadores podem ver seus próprios registros de pagamento
CREATE POLICY "Drivers can view own payment records"
ON public.order_payments
FOR SELECT
USING (
  driver_user_id = auth.uid() 
  OR company_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Entregadores podem criar registros de pagamento para seus pedidos
CREATE POLICY "Drivers can insert payment records for their orders"
ON public.order_payments
FOR INSERT
WITH CHECK (
  driver_user_id = auth.uid() 
  AND has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND o.driver_user_id = auth.uid()
    AND o.status = 'completed'::order_status
  )
);

-- Criar tabela payment_history para histórico detalhado
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_user_id UUID NOT NULL,
  company_user_id UUID NOT NULL,
  payment_month TEXT NOT NULL,
  total_orders INTEGER NOT NULL,
  total_value NUMERIC NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para payment_history
CREATE INDEX idx_payment_history_driver ON public.payment_history(driver_user_id);
CREATE INDEX idx_payment_history_company ON public.payment_history(company_user_id);
CREATE INDEX idx_payment_history_marked_at ON public.payment_history(marked_at DESC);

-- Habilitar RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seu próprio histórico
CREATE POLICY "Users can view own payment history"
ON public.payment_history
FOR SELECT
USING (
  driver_user_id = auth.uid() 
  OR company_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Entregadores podem inserir histórico
CREATE POLICY "Drivers can insert payment history"
ON public.payment_history
FOR INSERT
WITH CHECK (
  driver_user_id = auth.uid() 
  AND has_role(auth.uid(), 'driver'::app_role)
);

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;

-- Função para criar notificação de relatório atrasado
CREATE OR REPLACE FUNCTION public.check_overdue_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver RECORD;
  v_company RECORD;
  v_overdue_date DATE;
BEGIN
  -- Data limite: 30 dias atrás
  v_overdue_date := CURRENT_DATE - INTERVAL '30 days';
  
  -- Buscar entregadores com pedidos completados há mais de 30 dias sem pagamento
  FOR v_driver IN
    SELECT DISTINCT 
      o.driver_user_id,
      o.company_user_id,
      cp.company_name,
      COUNT(*) as order_count,
      SUM(o.total_value) as total_value
    FROM public.orders o
    JOIN public.company_profiles cp ON cp.user_id = o.company_user_id
    LEFT JOIN public.order_payments op ON op.order_id = o.id
    WHERE o.status = 'completed'
      AND o.completed_at < v_overdue_date
      AND op.id IS NULL
      AND o.driver_user_id IS NOT NULL
    GROUP BY o.driver_user_id, o.company_user_id, cp.company_name
  LOOP
    -- Verificar se já existe notificação recente (últimos 7 dias)
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_driver.driver_user_id
        AND tag = 'credits'
        AND title LIKE '%Relatório Pendente%'
        AND created_at > CURRENT_DATE - INTERVAL '7 days'
    ) THEN
      -- Criar notificação para o entregador
      INSERT INTO public.notifications (user_id, tag, title, message)
      VALUES (
        v_driver.driver_user_id,
        'credits',
        'Relatório Pendente - Atenção!',
        format('Você tem %s pedido(s) da empresa %s pendentes há mais de 30 dias. Valor total: R$ %s', 
          v_driver.order_count, 
          v_driver.company_name,
          to_char(v_driver.total_value, 'FM999G999D00')
        )
      );
    END IF;
  END LOOP;
END;
$$;