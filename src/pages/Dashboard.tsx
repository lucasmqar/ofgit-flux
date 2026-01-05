import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AdminDashboard from './admin/AdminDashboard';
import EmpresaDashboard from './empresa/EmpresaDashboard';
import EntregadorDashboard from './entregador/EntregadorDashboard';

const Dashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no role (Google signup incomplete), redirect to complete profile
  if (!user.role) {
    return <Navigate to="/completar-perfil" replace />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'company':
      return <EmpresaDashboard />;
    case 'driver':
      return <EntregadorDashboard />;
    default:
      return <Navigate to="/auth" replace />;
  }
};

export default Dashboard;

