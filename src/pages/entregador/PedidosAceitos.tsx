import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useDriverOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useProfile } from '@/hooks/useProfile';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { 
  Truck,
  CheckCircle2,
  MessageCircle,
  Eye,
  Building2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBrasiliaDateShort } from '@/types';
import { formatOrderCode } from '@/lib/utils';

const PedidosAceitos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: myOrders = [], isLoading } = useDriverOrders(user?.id);
  const updateStatusMutation = useUpdateOrderStatus();

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('driver-accepted-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `driver_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', 'driver', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  if (!user || user.role !== 'driver') return null;

  const acceptedOrders = myOrders.filter(o => o.status === 'accepted');

  const handleFinishOrder = async (orderId: string) => {
    try {
      const order = acceptedOrders.find(o => o.id === orderId);
      const allValidated = (order?.order_deliveries || []).every((d: any) => !!d.validated_at);
      if (!allValidated) {
        toast.error('Valide todas as entregas antes de finalizar');
        return;
      }

      await updateStatusMutation.mutateAsync({
        orderId,
        status: 'driver_completed',
      });
      toast.success('Pedido marcado como finalizado! Aguardando confirmação da empresa.');
    } catch (error) {
      toast.error('Erro ao finalizar pedido');
    }
  };

  const handleWhatsAppCompany = (companyPhone: string, orderId: string) => {
    if (companyPhone) {
      const url = `https://wa.me/55${companyPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sou o entregador do pedido ${formatOrderCode(orderId)}`)}`;
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
              <Truck className="h-6 w-6 text-blue-600" />
              Em Andamento
            </h1>
            <p className="text-muted-foreground">{acceptedOrders.length} pedido(s) aceito(s)</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : acceptedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pedido em andamento</h3>
            <p className="text-muted-foreground mb-4">Aceite pedidos disponíveis para começar</p>
            <Button onClick={() => navigate('/pedidos-disponiveis')}>
              Ver Pedidos Disponíveis
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {acceptedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onFinish={() => handleFinishOrder(order.id)}
                onViewDetails={() => navigate(`/pedido/${order.id}`)}
                onWhatsApp={(phone) => handleWhatsAppCompany(phone, order.id)}
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
  onFinish, 
  onViewDetails,
  onWhatsApp,
  isPending
}: { 
  order: any; 
  onFinish: () => void; 
  onViewDetails: () => void;
  onWhatsApp: (phone: string) => void;
  isPending: boolean;
}) => {
  const { data: companyProfile } = useCompanyProfile(order.company_user_id);
  const { data: profile } = useProfile(order.company_user_id);

  return (
    <div className="card-static p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold">Pedido {formatOrderCode(order.id)}</span>
          <StatusBadge status={order.status} size="sm" />
        </div>
        <span className="text-sm text-muted-foreground">
          {formatBrasiliaDateShort(new Date(order.created_at))}
        </span>
      </div>
      
      <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-secondary/50">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{companyProfile?.company_name || profile?.name}</p>
          {companyProfile?.address_default && (
            <p className="text-xs text-muted-foreground">{companyProfile.address_default}</p>
          )}
        </div>
        {profile?.phone && (
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

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span>{order.order_deliveries?.length || 0} entrega{(order.order_deliveries?.length || 0) > 1 ? 's' : ''}</span>
        <span className="font-medium text-foreground">R$ {order.total_value.toFixed(2)}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onFinish} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Finalizar Pedido
        </Button>
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4" />
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
};

export default PedidosAceitos;
