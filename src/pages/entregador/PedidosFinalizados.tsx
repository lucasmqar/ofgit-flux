import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useDriverOrders } from '@/hooks/useOrders';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useProfile } from '@/hooks/useProfile';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { 
  Clock,
  Eye,
  Building2,
  ArrowLeft,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBrasiliaDateShort } from '@/types';
import { formatOrderCode } from '@/lib/utils';

const PedidosFinalizados = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: myOrders = [], isLoading } = useDriverOrders(user?.id);

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('driver-completed-orders')
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

  const driverCompletedOrders = myOrders.filter(o => o.status === 'driver_completed');

  const handleWhatsAppCompany = (companyPhone: string, orderId: string) => {
    if (companyPhone) {
      const url = `https://wa.me/55${companyPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sou o entregador do pedido ${formatOrderCode(orderId)}. Já finalizei a entrega, pode confirmar?`)}`;
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
              <Clock className="h-6 w-6 text-purple-600" />
              Aguardando Confirmação
            </h1>
            <p className="text-muted-foreground">{driverCompletedOrders.length} pedido(s) finalizados</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : driverCompletedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pedido aguardando confirmação</h3>
            <p className="text-muted-foreground">Pedidos finalizados aparecem aqui até a empresa confirmar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {driverCompletedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={() => navigate(`/pedido/${order.id}`)}
                onWhatsApp={(phone) => handleWhatsAppCompany(phone, order.id)}
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
  onViewDetails,
  onWhatsApp
}: { 
  order: any; 
  onViewDetails: () => void;
  onWhatsApp: (phone: string) => void;
}) => {
  const { data: companyProfile } = useCompanyProfile(order.company_user_id);
  const { data: profile } = useProfile(order.company_user_id);

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
      
      <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-white dark:bg-background">
        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
            Cobrar
          </Button>
        )}
      </div>

      <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
        Aguardando a empresa confirmar o recebimento da entrega.
      </p>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span>{order.order_deliveries?.length || 0} entrega{(order.order_deliveries?.length || 0) > 1 ? 's' : ''}</span>
        <span className="font-medium text-foreground">R$ {order.total_value.toFixed(2)}</span>
      </div>

      <Button variant="outline" size="sm" onClick={onViewDetails}>
        <Eye className="h-4 w-4" />
        Ver Detalhes
      </Button>
    </div>
  );
};

export default PedidosFinalizados;
