import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Eye,
  Trash2,
  Building2,
  User,
  Package,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn, formatOrderCode } from '@/lib/utils';
import type { OrderWithDeliveries } from '@/hooks/useOrders';

const GerenciarPedidos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderWithDeliveries[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name');
      
      if (error) throw error;
      return data;
    },
  });

  if (!user || user.role !== 'admin') return null;

  const getProfileName = (userId: string) => {
    return profiles?.find(p => p.id === userId)?.name || 'Desconhecido';
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const handleDelete = (orderId: string) => {
    toast.info('Funcionalidade de exclusão em desenvolvimento');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Gerenciar Pedidos</h1>
              <p className="text-muted-foreground">{orders?.length || 0} pedidos</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!orders || orders.length === 0) && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pedido registrado</p>
          </div>
        )}

        {/* Orders list */}
        <div className="space-y-3">
          {orders?.map((order, index) => (
            <div
              key={order.id}
              className="card-static p-4 opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-sm">
                    {formatOrderCode(order.id)}
                  </span>
                  <StatusBadge status={order.status} size="sm" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(order.created_at)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Empresa:</span>
                  <span className="font-medium text-foreground">{getProfileName(order.company_user_id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Entregador:</span>
                  <span className="font-medium text-foreground">
                    {order.driver_user_id ? getProfileName(order.driver_user_id) : '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{order.order_deliveries?.length || 0} entregas</span>
                </div>
                <span className="font-semibold text-foreground">R$ {order.total_value.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => navigate(`/pedido/${order.id}`)}>
                  <Eye className="h-4 w-4" />
                  Ver Detalhes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default GerenciarPedidos;
