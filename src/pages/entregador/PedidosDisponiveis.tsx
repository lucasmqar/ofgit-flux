import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { openInstitutionalSite } from '@/lib/externalLinks';
import { useAvailableOrders, useUpdateOrderStatus, useDriverOrders } from '@/hooks/useOrders';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useProfile } from '@/hooks/useProfile';
import { useDriverProfile } from '@/hooks/useDriverProfiles';
import { formatBrasiliaDateShort, PACKAGE_TYPE_LABELS } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { 
  ArrowLeft, 
  Building2,
  Package,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const PedidosDisponiveis = () => {
  const { user, hasCredits } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: driverProfile } = useDriverProfile(user?.id);
  const driverCity = driverProfile?.city ?? null;
  const { data: availableOrders = [], isLoading } = useAvailableOrders(driverCity);
  const { data: driverOrders = [] } = useDriverOrders(user?.id);
  const updateStatusMutation = useUpdateOrderStatus();

  // Check if driver has any order in progress
  // Driver should be considered busy only while an order is actively accepted.
  const hasOrderInProgress = driverOrders.some(o => o.status === 'accepted');

  // Real-time subscription para novos pedidos
  useEffect(() => {
    if (!user || user.role !== 'driver') return;
    if (driverProfile && !driverCity) {
      toast.error('Defina sua cidade no seu perfil para ver pedidos disponíveis');
      navigate('/completar-perfil');
    }

    const channel = supabase.channel('driver-available-orders');

    // New pending orders
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.pending',
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['orders', 'available'] });
      }
    );

    // When any order becomes accepted, refresh available list (it should disappear)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.accepted',
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['orders', 'available'] });
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, user?.role, driverProfile, driverCity, navigate]);

  if (!user || user.role !== 'driver') return null;

  const handleAccept = async (orderId: string) => {
    if (hasOrderInProgress) {
      toast.error('Finalize sua entrega atual antes de aceitar outro pedido');
      return;
    }
    
    if (!hasCredits) {
      toast.error('Acesso necessário para aceitar pedidos');
      navigate('/creditos');
      return;
    }
    
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        status: 'accepted',
        driverUserId: user.id,
      });
      toast.success('Pedido aceito com sucesso! 🎉');
      navigate(`/pedido/${orderId}`);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao aceitar pedido');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Pedidos Disponíveis
            </h1>
            <p className="text-muted-foreground">{availableOrders.length} pedidos aguardando você</p>
          </div>
        </div>

        {/* Warning if has order in progress */}
        {hasOrderInProgress && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Você tem uma entrega em andamento. Finalize-a para aceitar novos pedidos.
            </p>
            <Button 
              size="sm" 
              variant="outline"
              className="mt-2" 
              onClick={() => navigate('/meus-pedidos')}
            >
              Ver Meus Pedidos
            </Button>
          </div>
        )}

        {/* Dica para entregador */}
        {hasCredits && availableOrders.length > 0 && !hasOrderInProgress && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200">
            <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Aceite pedidos rápido para ganhar mais! Quanto antes você aceitar, mais entregas você faz.
            </p>
          </div>
        )}

        {/* No credits warning */}
        {!hasCredits && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-800 font-medium">
              🔒 Acesso necessário para aceitar pedidos.
            </p>
            <Button 
              size="sm" 
              className="mt-2" 
              onClick={openInstitutionalSite}
            >
              Ver opções no site
            </Button>
          </div>
        )}

        {/* Orders list */}
        <div className="space-y-4">
          {availableOrders.map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              index={index}
              onAccept={() => handleAccept(order.id)}
              onViewDetails={() => navigate(`/pedido/${order.id}`)}
              hasCredits={hasCredits}
              hasOrderInProgress={hasOrderInProgress}
              isPending={updateStatusMutation.isPending}
            />
          ))}

          {availableOrders.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">Nenhum pedido disponível</p>
              <p className="text-muted-foreground mb-4">Novos pedidos aparecerão aqui automaticamente.</p>
              <p className="text-sm text-muted-foreground">Fique de olho! A lista é atualizada em tempo real.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

const OrderCard = ({ 
  order, 
  index,
  onAccept, 
  onViewDetails, 
  hasCredits,
  hasOrderInProgress,
  isPending 
}: { 
  order: any;
  index: number;
  onAccept: () => void; 
  onViewDetails: () => void;
  hasCredits: boolean;
  hasOrderInProgress: boolean;
  isPending: boolean;
}) => {
  const { data: companyProfile } = useCompanyProfile(order.company_user_id);
  const { data: profile } = useProfile(order.company_user_id);

  const deliveriesCount = order.order_deliveries?.length || 0;

  return (
    <div
      className={cn(
        "card-static overflow-hidden opacity-0 animate-fade-in",
        "hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header com valor destacado */}
      <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {companyProfile?.company_name || profile?.name || 'Empresa'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatBrasiliaDateShort(new Date(order.created_at))}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              R$ {order.total_value.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {deliveriesCount} entrega{deliveriesCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Detalhes */}
      <div className="p-4 space-y-3">
        {companyProfile?.address_default && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{companyProfile.address_default}</span>
          </div>
        )}

        {/* Tipos de pacote */}
        <div className="flex flex-wrap items-center gap-2">
          {order.order_deliveries?.slice(0, 4).map((d: any) => (
            <span 
              key={d.id} 
              className="px-2.5 py-1 bg-secondary rounded-full text-xs font-medium text-muted-foreground"
            >
              {PACKAGE_TYPE_LABELS[d.package_type as keyof typeof PACKAGE_TYPE_LABELS]}
            </span>
          ))}
          {deliveriesCount > 4 && (
            <span className="px-2.5 py-1 bg-secondary rounded-full text-xs font-medium text-muted-foreground">
              +{deliveriesCount - 4} mais
            </span>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewDetails}
            className="flex-1"
          >
            <Eye className="h-4 w-4" />
            Ver Detalhes
          </Button>
          <Button 
            size="sm" 
            onClick={onAccept} 
            disabled={!hasCredits || hasOrderInProgress || isPending}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {hasOrderInProgress ? 'Finalize sua entrega' : 'Aceitar Pedido'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PedidosDisponiveis;
