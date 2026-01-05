import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { StatsCard } from '@/components/StatsCard';
import { useUsers } from '@/hooks/useUsers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Building2, 
  Truck, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck,
  CreditCard,
  BarChart3,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: users, isLoading: usersLoading } = useUsers();
  
  const { data: ordersStats, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'stats'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status');
      
      if (error) throw error;
      
      const total = orders.length;
      const pending = orders.filter(o => o.status === 'pending').length;
      const completed = orders.filter(o => o.status === 'completed').length;
      const cancelled = orders.filter(o => o.status === 'cancelled').length;
      
      return { total, pending, completed, cancelled };
    },
  });

  if (!user || user.role !== 'admin') return null;

  const totalUsers = users?.length || 0;
  const totalCompanies = users?.filter(u => u.role === 'company').length || 0;
  const totalDrivers = users?.filter(u => u.role === 'driver').length || 0;
  const activeUsers = users?.filter(u => 
    u.role === 'admin' || (u.credits && new Date(u.credits.validUntil) > new Date())
  ).length || 0;

  const isLoading = usersLoading || ordersLoading;

  const quickActions = [
    {
      label: 'Gerenciar Usuários',
      icon: Users,
      path: '/admin/usuarios',
      description: 'Ver, editar e gerenciar usuários',
    },
    {
      label: 'Monitorar Pedidos',
      icon: Package,
      path: '/admin/pedidos',
      description: 'Acompanhar todos os pedidos',
    },
    {
      label: 'Gerenciar Créditos',
      icon: CreditCard,
      path: '/admin/creditos',
      description: 'Adicionar créditos aos usuários',
    },
    {
      label: 'Alertas',
      icon: AlertTriangle,
      path: '/admin/alertas',
      description: 'Criar alertas para usuários',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard Admin</h1>
            <p className="text-muted-foreground">Visão geral do sistema FLUX</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            <span>Atualizado agora</span>
          </div>
        </div>

        {/* User Stats */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Usuários</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total de Usuários"
              value={totalUsers}
              icon={Users}
              delay={0}
            />
            <StatsCard
              title="Empresas"
              value={totalCompanies}
              icon={Building2}
              delay={50}
            />
            <StatsCard
              title="Entregadores"
              value={totalDrivers}
              icon={Truck}
              delay={100}
            />
            <StatsCard
              title="Ativos Agora"
              value={activeUsers}
              icon={UserCheck}
              iconClassName="bg-status-completed/15 text-status-completed"
              delay={150}
            />
          </div>
        </div>

        {/* Order Stats */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Pedidos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total de Pedidos"
              value={ordersStats?.total || 0}
              icon={Package}
              delay={200}
            />
            <StatsCard
              title="Aguardando"
              value={ordersStats?.pending || 0}
              icon={Clock}
              iconClassName="bg-status-open/15 text-status-open"
              delay={250}
            />
            <StatsCard
              title="Concluídos"
              value={ordersStats?.completed || 0}
              icon={CheckCircle2}
              iconClassName="bg-status-completed/15 text-status-completed"
              delay={300}
            />
            <StatsCard
              title="Cancelados"
              value={ordersStats?.cancelled || 0}
              icon={XCircle}
              iconClassName="bg-status-cancelled/15 text-status-cancelled"
              delay={350}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="card-elevated p-6 text-left group opacity-0 animate-fade-in"
                style={{ animationDelay: `${400 + index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <action.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
