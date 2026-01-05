import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { ClickableStatsCard } from '@/components/ClickableStatsCard';
import { Button } from '@/components/ui/button';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useProfile } from '@/hooks/useProfile';
import { useDriverProfile } from '@/hooks/useDriverProfiles';
import { ExpiredCreditBanner, InfoBanner } from '@/components/banners';
import { StatusBadge } from '@/components/StatusBadge';
import { GettingStartedGuide } from '@/components/GettingStartedGuide';
import { openWhatsApp, getSupportWhatsAppUrl } from '@/lib/whatsapp';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Truck,
  Plus,
  MessageCircle,
  Eye,
  User,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatBrasiliaDateShort } from '@/types';
import { formatOrderCode } from '@/lib/utils';

const EmpresaDashboard = () => {
  const { user, hasCredits } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Enable realtime notifications
  useRealtimeNotifications(user?.id, user?.role ?? undefined);

  // Real-time subscription para pedidos da empresa
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('dashboard-company-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', 'company', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  // Use real data from Supabase
  const { data: orders = [], isLoading } = useOrders(user?.id);
  const updateStatusMutation = useUpdateOrderStatus();

  if (!user || user.role !== 'company') return null;

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  const driverCompletedOrders = orders.filter(o => o.status === 'driver_completed');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const stats = {
    pending: pendingOrders.length,
    accepted: acceptedOrders.length,
    completed: completedOrders.length,
    cancelled: cancelledOrders.length,
  };

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
      <div className="space-y-8 overflow-x-hidden pb-8">
        {/* Expired credit banner */}
        <ExpiredCreditBanner />

        {/* Info banner */}
        {hasCredits && <InfoBanner variant="compact" />}

        <GettingStartedGuide userId={user.id} role="company" hasCredits={hasCredits} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Olá, {user.name}</p>
          </div>
          <Button
            size="lg"
            onClick={() => navigate('/novo-pedido')}
            disabled={!hasCredits}
          >
            <Plus className="h-5 w-5" />
            Novo Pedido
          </Button>
        </div>

        {/* Stats - Clickable - 4 Views */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ClickableStatsCard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
            iconClassName="bg-status-open/15 text-status-open"
            delay={0}
            href="/pedidos-pendentes"
          />
          <ClickableStatsCard
            title="Em Andamento"
            value={stats.accepted}
            icon={Truck}
            iconClassName="bg-status-accepted/15 text-status-accepted"
            delay={50}
            href="/pedidos-em-andamento"
          />
          <ClickableStatsCard
            title="Confirmação"
            value={driverCompletedOrders.length}
            icon={Package}
            iconClassName="bg-status-collected/15 text-status-collected"
            delay={100}
            href="/confirmacao-entrega"
          />
          <ClickableStatsCard
            title="Concluídos"
            value={stats.completed}
            icon={CheckCircle2}
            iconClassName="bg-status-completed/15 text-status-completed"
            delay={150}
            href="/empresa/concluidos"
          />
        </div>

        {/* SOLICITAÇÕES - Aguardando aceitar */}
        {pendingOrders.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Aguardando Entregador ({pendingOrders.length})
            </h2>
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="card-static p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">Pedido {formatOrderCode(order.id)}</span>
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
          </section>
        )}

        {/* ACEITAS / EM ANDAMENTO */}
        {acceptedOrders.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Em Andamento ({acceptedOrders.length})
            </h2>
            <div className="space-y-3">
              {acceptedOrders.map((order) => (
                <InProgressOrderCard
                  key={order.id}
                  order={order}
                  onViewDetails={() => navigate(`/pedido/${order.id}`)}
                  onWhatsApp={(phone) => handleWhatsAppDriver(phone, order.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* AGUARDANDO CONFIRMAÇÃO */}
        {driverCompletedOrders.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              Aguardando Confirmação ({driverCompletedOrders.length})
            </h2>
            <div className="space-y-3">
              {driverCompletedOrders.map((order) => (
                <AwaitingConfirmationCard
                  key={order.id}
                  order={order}
                  onConfirm={() => handleConfirmDelivery(order.id)}
                  onViewDetails={() => navigate(`/pedido/${order.id}`)}
                  isPending={updateStatusMutation.isPending}
                />
              ))}
            </div>
          </section>
        )}

        {/* CONCLUÍDAS */}
        {completedOrders.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Concluídos
              </h2>
            {completedOrders.length > 3 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/empresa/concluidos')}>
                Ver todos ({completedOrders.length})
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            </div>
            <div className="space-y-3">
              {completedOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="card-static p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">Pedido {formatOrderCode(order.id)}</span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">R$ {order.total_value.toFixed(2)}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/pedido/${order.id}`)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Support and Tips Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-static p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Suporte FLUX</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Precisa de ajuda? Nossa equipe está disponível para te auxiliar.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openWhatsApp(getSupportWhatsAppUrl(user, location.pathname))}
            >
              <MessageCircle className="h-4 w-4" />
              Falar com Suporte
            </Button>
          </div>
          <div className="card-static p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-foreground">Dica de Segurança</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Compartilhe o código de entrega apenas quando o entregador chegar ao destino. 
              Nunca envie o código antes da confirmação presencial.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

// In Progress Order Card for Company
const InProgressOrderCard = ({ 
  order, 
  onViewDetails,
  onWhatsApp 
}: { 
  order: any; 
  onViewDetails: () => void;
  onWhatsApp: (phone: string) => void;
}) => {
  const { data: driverProfile } = useDriverProfile(order.driver_user_id);
  const { data: profile } = useProfile(order.driver_user_id);

  const vehicleIcons: Record<string, string> = {
    moto: '🏍️',
    car: '🚗',
    bike: '🚲',
  };

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
      
      {profile && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-secondary/50">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
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

// Awaiting Confirmation Card
const AwaitingConfirmationCard = ({ 
  order, 
  onConfirm, 
  onViewDetails,
  isPending
}: { 
  order: any; 
  onConfirm: () => void; 
  onViewDetails: () => void;
  isPending: boolean;
}) => {
  const { data: profile } = useProfile(order.driver_user_id);

  return (
    <div className="card-static p-4 border-2 border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold">Pedido {formatOrderCode(order.id)}</span>
          <StatusBadge status={order.status} size="sm" />
        </div>
      </div>
      
      <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
        Entregador <strong>{profile?.name || 'Entregador'}</strong> finalizou. Confirme o recebimento.
      </p>

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
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
};

export default EmpresaDashboard;
