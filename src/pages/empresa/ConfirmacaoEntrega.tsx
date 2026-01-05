import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useProfile } from '@/hooks/useProfile';
import { useDriverProfile } from '@/hooks/useDriverProfiles';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { 
  CheckCircle2,
  Eye,
  User,
  ArrowLeft,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBrasiliaDateShort } from '@/types';
import { formatOrderCode } from '@/lib/utils';

const ConfirmacaoEntrega = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useOrders(user?.id);
  const updateStatusMutation = useUpdateOrderStatus();

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('company-driver-completed-orders')
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

  const driverCompletedOrders = orders.filter(o => o.status === 'driver_completed');

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        status: 'completed',
      });
      toast.success('Entrega confirmada!');
    } catch (error) {
      toast.error('Erro ao confirmar entrega');
    }
  };

  const handleWhatsAppDriver = (driverPhone: string, orderId: string) => {
    if (driverPhone) {
      const url = `https://wa.me/55${driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sou da empresa do pedido ${formatOrderCode(orderId)}`)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-purple-600" />
              Confirmação de Entrega
            </h1>
            <p className="text-muted-foreground">{driverCompletedOrders.length} pedido(s) aguardando confirmação</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : driverCompletedOrders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma confirmação pendente</h3>
            <p className="text-muted-foreground">Entregas finalizadas pelos entregadores aparecem aqui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {driverCompletedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onConfirm={() => handleConfirmDelivery(order.id)}
                onViewDetails={() => navigate(`/pedido/${order.id}`)}
                onWhatsApp={(phone) => handleWhatsAppDriver(phone, order.id)}
                isPending={updateStatusMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const OrderCard = ({ 
  order, 
  onConfirm,
  onViewDetails,
  onWhatsApp,
  isPending
}: { 
  order: any; 
  onConfirm: () => void;
  onViewDetails: () => void;
  onWhatsApp: (phone: string) => void;
  isPending: boolean;
}) => {
  const { data: driverProfile } = useDriverProfile(order.driver_user_id);
  const { data: profile } = useProfile(order.driver_user_id);

  const vehicleIcons: Record<string, string> = {
    moto: '🏍️',
    car: '🚗',
    bike: '🚲',
  };

  return (
    <div className="card-static p-4 border-2 border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold">Pedido {formatOrderCode(order.id)}</span>
          <StatusBadge status={order.status} size="sm" />
        </div>
        <span className="text-sm text-muted-foreground">
          {formatBrasiliaDateShort(new Date(order.created_at))}
        </span>
      </div>
      
      {profile && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-white dark:bg-background">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{profile.name}</p>
            {driverProfile && (
              <p className="text-xs text-muted-foreground">
                {vehicleIcons[driverProfile.vehicle_type] || '🚗'} {driverProfile.vehicle_model} • {driverProfile.plate}
              </p>
            )}
          </div>
          {profile.phone && (
            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
              onClick={() => onWhatsApp(profile.phone!)}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          )}
        </div>
      )}

      <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
        O entregador finalizou a entrega. Confirme o recebimento para concluir.
      </p>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span>{order.order_deliveries?.length || 0} entrega{(order.order_deliveries?.length || 0) > 1 ? 's' : ''}</span>
        <span className="font-medium text-foreground">R$ {order.total_value.toFixed(2)}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onConfirm} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Confirmar Recebimento
        </Button>
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4" />
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
};

export default ConfirmacaoEntrega;
