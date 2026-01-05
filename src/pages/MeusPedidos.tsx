import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useOrders, useDriverOrders } from '@/hooks/useOrders';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useProfile } from '@/hooks/useProfile';
import { useDriverProfile } from '@/hooks/useDriverProfiles';
import { getDriverWhatsAppUrl, getCompanyWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';
import { OrderStatus, formatBrasiliaDateShort } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Eye, 
  XCircle, 
  MessageCircle,
  Building2,
  User,
  Package,
  Loader2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn, formatOrderCode } from '@/lib/utils';

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'accepted', label: 'Aceitos' },
  { value: 'driver_completed', label: 'Entregues' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'cancelled', label: 'Cancelados' },
];

const MeusPedidos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') as OrderStatus | 'all' || 'all';
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(initialStatus);

  // Use hooks for both roles
  const { data: companyOrders = [], isLoading: isLoadingCompany } = useOrders(
    user?.role === 'company' ? user.id : undefined
  );
  const { data: driverOrders = [], isLoading: isLoadingDriver } = useDriverOrders(
    user?.role === 'driver' ? user.id : undefined
  );

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('my-orders-updates');

    if (user.role === 'company') {
      channel.on(
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
      );
    } else if (user.role === 'driver') {
      channel.on(
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
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (!user) return null;

  const orders = user.role === 'company' ? companyOrders : driverOrders;
  const isLoading = user.role === 'company' ? isLoadingCompany : isLoadingDriver;

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

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
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Meus Pedidos</h1>
            <p className="text-muted-foreground">{orders.length} pedidos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Orders list */}
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              index={index}
              userRole={user.role}
              onViewDetails={() => navigate(`/pedido/${order.id}`)}
            />
          ))}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
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
  userRole,
  onViewDetails 
}: { 
  order: any;
  index: number;
  userRole: string;
  onViewDetails: () => void;
}) => {
  // Fetch profiles based on role
  const { data: driverProfile } = useDriverProfile(
    userRole === 'company' && order.driver_user_id ? order.driver_user_id : undefined
  );
  const { data: driverUser } = useProfile(
    userRole === 'company' && order.driver_user_id ? order.driver_user_id : undefined
  );
  const { data: companyProfile } = useCompanyProfile(
    userRole === 'driver' ? order.company_user_id : undefined
  );
  const { data: companyUser } = useProfile(
    userRole === 'driver' ? order.company_user_id : undefined
  );

  const deliveriesCount = order.order_deliveries?.length || 0;

  const handleWhatsApp = () => {
    if (userRole === 'company' && order.driver_user_id && driverUser?.phone) {
      openWhatsApp(getDriverWhatsAppUrl(driverUser.phone, formatOrderCode(order.id)));
    } else if (userRole === 'driver' && companyUser?.phone) {
      openWhatsApp(getCompanyWhatsAppUrl(companyUser.phone, formatOrderCode(order.id)));
    }
  };

  return (
    <div
      className={cn(
        "card-static p-5 opacity-0 animate-fade-in",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono font-semibold text-foreground">
            Pedido {formatOrderCode(order.id)}
          </span>
          <StatusBadge status={order.status} size="sm" />
        </div>
        <span className="text-sm text-muted-foreground">
          {formatBrasiliaDateShort(new Date(order.created_at))}
        </span>
      </div>

      {/* Company info (for driver) */}
      {userRole === 'driver' && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-secondary/50">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {companyProfile?.company_name || companyUser?.name || 'Empresa'}
            </p>
            {companyProfile?.address_default && (
              <p className="text-xs text-muted-foreground truncate">
                {companyProfile.address_default}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Driver info (for company) */}
      {userRole === 'company' && order.driver_user_id && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-secondary/50">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {driverUser?.name || 'Entregador'}
            </p>
            {driverProfile && (
              <p className="text-xs text-muted-foreground truncate">
                {driverProfile.vehicle_type === 'moto' ? '🏍️' : driverProfile.vehicle_type === 'car' ? '🚗' : '🚲'}{' '}
                {driverProfile.vehicle_model} • {driverProfile.plate}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Deliveries summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Package className="h-4 w-4" />
          <span>{deliveriesCount} entrega{deliveriesCount > 1 ? 's' : ''}</span>
        </div>
        <span className="font-semibold text-foreground">R$ {order.total_value.toFixed(2)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-border flex-wrap">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4" />
          Ver Detalhes
        </Button>
        
        {['accepted', 'driver_completed'].includes(order.status) && (
          <Button
            size="sm"
            className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
};

export default MeusPedidos;
