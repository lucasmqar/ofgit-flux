import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/useOrders';
import { useProfile } from '@/hooks/useProfile';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBrasiliaDateShort } from '@/types';
import { formatOrderCode } from '@/lib/utils';

const PedidosConcluidos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useOrders(user?.id);

  if (!user || user.role !== 'company') return null;

  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalSpent = completedOrders.reduce((sum, o) => sum + o.total_value, 0);

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              Pedidos Concluídos
            </h1>
            <p className="text-muted-foreground">{completedOrders.length} pedido(s) concluído(s)</p>
          </div>
        </div>

        {/* Spending Summary */}
        <div className="card-static p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">Total gasto em entregas</p>
              <p className="text-2xl font-bold text-emerald-800">R$ {totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : completedOrders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum pedido concluído ainda</h3>
            <p className="text-muted-foreground mb-4">Seus pedidos finalizados aparecem aqui</p>
            <Button onClick={() => navigate('/novo-pedido')}>
              Criar Novo Pedido
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={() => navigate(`/pedido/${order.id}`)}
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
  onViewDetails
}: { 
  order: any; 
  onViewDetails: () => void;
}) => {
  const { data: profile } = useProfile(order.driver_user_id);

  return (
    <div className="card-static p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono font-semibold">Pedido {formatOrderCode(order.id)}</span>
            <StatusBadge status={order.status} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground">
            Entregador: {profile?.name || 'N/A'} • {formatBrasiliaDateShort(new Date(order.created_at))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">R$ {order.total_value.toFixed(2)}</span>
          <Button variant="ghost" size="icon-sm" onClick={onViewDetails}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PedidosConcluidos;
