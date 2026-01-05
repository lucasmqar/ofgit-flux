import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { 
  Clock,
  XCircle,
  Eye,
  ArrowLeft,
  Loader2,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBrasiliaDateShort } from '@/types';

const PedidosPendentes = () => {
  const { user, hasCredits } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useOrders(user?.id);
  const updateStatusMutation = useUpdateOrderStatus();

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('company-pending-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  if (!user || user.role !== 'company') return null;

  const pendingOrders = orders.filter(o => o.status === 'pending');

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        status: 'cancelled',
      });
      toast.success('Pedido cancelado');
    } catch (error) {
      toast.error('Erro ao cancelar pedido');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-6 w-6 text-amber-600" />
                Pedidos Pendentes
              </h1>
              <p className="text-muted-foreground">{pendingOrders.length} pedido(s) aguardando entregador</p>
            </div>
          </div>
          <Button onClick={() => navigate('/novo-pedido')} disabled={!hasCredits}>
            <Plus className="h-4 w-4" />
            Novo Pedido
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pedido pendente</h3>
            <p className="text-muted-foreground mb-4">Crie um novo pedido para solicitar uma entrega</p>
            <Button onClick={() => navigate('/novo-pedido')} disabled={!hasCredits}>
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div key={order.id} className="card-static p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold">Pedido #{order.id.slice(0, 8)}</span>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatBrasiliaDateShort(new Date(order.created_at))}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>{order.order_deliveries?.length || 0} entrega{(order.order_deliveries?.length || 0) > 1 ? 's' : ''}</span>
                  <span className="font-medium text-foreground">R$ {order.total_value.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/pedido/${order.id}`)}>
                    <Eye className="h-4 w-4" />
                    Detalhes
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PedidosPendentes;
