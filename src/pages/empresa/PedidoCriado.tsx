import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { PACKAGE_TYPE_LABELS, PackageType } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  ArrowRight, 
  Clock,
  User,
  Phone,
  Package,
} from 'lucide-react';

interface OrderSuccessState {
  orderId: string;
  deliveries: {
    id: string;
    dropoffAddress: string;
    packageType: PackageType;
    suggestedPrice: number;
    customerName?: string;
    customerPhone?: string;
  }[];
  totalValue: number;
}

const PedidoCriado = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as OrderSuccessState | null;

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!state?.orderId) return;

    const channel = supabase
      .channel(`order-created-${state.orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${state.orderId}`,
        },
        (payload) => {
          // If order was accepted by a driver, redirect to details
          if (payload.new.status === 'accepted') {
            navigate(`/pedido/${state.orderId}`, { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state?.orderId, navigate]);

  if (!state) {
    navigate('/dashboard');
    return null;
  }

  const { orderId, deliveries, totalValue } = state;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 px-0 sm:px-4 overflow-x-hidden">
        {/* Success Header */}
        <div className="text-center space-y-4 py-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pedido Criado!</h1>
            <p className="text-muted-foreground">
              Pedido #{orderId.slice(0, 8)} • R$ {totalValue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Important Info */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Aguardando Entregador</p>
            <p className="text-sm text-blue-700">
              Os códigos de validação serão gerados e enviados automaticamente via SMS para os clientes 
              quando um entregador aceitar o pedido. Você poderá visualizá-los na página "Códigos" na barra lateral.
            </p>
          </div>
        </div>

        {/* Deliveries Summary */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-foreground">
            Entregas do Pedido ({deliveries.length})
          </h2>
          
          {deliveries.map((delivery, index) => (
            <div key={delivery.id} className="card-static overflow-hidden p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {PACKAGE_TYPE_LABELS[delivery.packageType]}
                    </p>
                    <span className="text-sm font-semibold text-foreground">
                      R$ {delivery.suggestedPrice.toFixed(2)}
                    </span>
                  </div>
                  
                  {delivery.customerName && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{delivery.customerName}</span>
                    </div>
                  )}
                  
                  {delivery.customerPhone && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{delivery.customerPhone}</span>
                    </div>
                  )}
                  
                  {delivery.dropoffAddress && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="truncate">{delivery.dropoffAddress}</span>
                    </div>
                  )}
                  
                  <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium">
                      ⏳ Código será gerado quando o entregador aceitar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button 
            size="lg" 
            className="w-full"
            onClick={() => navigate(`/pedido/${orderId}`)}
          >
            Ver Detalhes do Pedido
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default PedidoCriado;
