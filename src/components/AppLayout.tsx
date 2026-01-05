import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import logoClaro from '@/assets/logo_tclaro.png';
import logoEscuro from '@/assets/logo_tescuro.png';

import { getSupportWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useUserAlerts } from '@/hooks/useAdminAlerts';
import { useNotifications } from '@/hooks/useNotifications';
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  User,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  Plus,
  Truck,
  MessageCircle,
  Bell,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, signOut, hasCredits } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get the appropriate logo based on theme
  const currentLogo = resolvedTheme === 'dark' ? logoEscuro : logoClaro;

  // Get notification settings from localStorage
  const [notificationSettings, setNotificationSettings] = useState({
    showToasts: true,
    soundEnabled: false,
  });

  useEffect(() => {
    const popupEnabled = localStorage.getItem('flux_popup_notifications') !== 'false';
    const soundEnabled = localStorage.getItem('flux_sound_notifications') !== 'false';
    setNotificationSettings({
      showToasts: popupEnabled,
      soundEnabled: soundEnabled,
    });
  }, []);

  // Enable realtime updates globally
  useRealtimeUpdates(notificationSettings);

  // Fetch alerts and notifications from database
  const { data: alertsData = [] } = useUserAlerts(user?.id);
  const { data: notificationsData = [] } = useNotifications(user?.id);

  if (!user) return null;

  const roleLabels = {
    admin: 'Administrador',
    company: 'Empresa',
    driver: 'Entregador',
  };

  const alerts = alertsData.filter((a: any) => a.active);
  const unreadNotifications = notificationsData.filter((n: any) => !n.read_at).length;

  // Define navigation items based on role
  const getNavItems = () => {
    const baseItems = [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ];

    if (user.role === 'admin') {
      return [
        ...baseItems,
        { label: 'Usuários', icon: Users, path: '/admin/usuarios' },
        { label: 'Pedidos', icon: Package, path: '/admin/pedidos' },
        { label: 'Créditos', icon: CreditCard, path: '/admin/creditos' },
        { label: 'Alertas', icon: AlertTriangle, path: '/admin/alertas' },
      ];
    }

    if (user.role === 'company') {
      return [
        ...baseItems,
        { label: 'Novo Pedido', icon: Plus, path: '/novo-pedido' },
        { label: 'Meus Pedidos', icon: Package, path: '/meus-pedidos' },
        { label: 'Códigos', icon: KeyRound, path: '/codigos-entrega' },
        { label: 'Relatórios', icon: FileText, path: '/relatorios' },
      ];
    }

    if (user.role === 'driver') {
      return [
        ...baseItems,
        { label: 'Disponíveis', icon: Truck, path: '/pedidos-disponiveis' },
        { label: 'Meus Pedidos', icon: Package, path: '/meus-pedidos' },
        { label: 'Relatórios', icon: FileText, path: '/relatorios' },
        { label: 'SOS', icon: AlertTriangle, path: '/sos', isEmergency: true },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  // Always accessible items
  const bottomItems = [
    { label: 'Notificações', icon: Bell, path: '/notificacoes', badge: unreadNotifications > 0 ? unreadNotifications : undefined },
    { label: 'Perfil', icon: User, path: '/perfil' },
    { label: 'Acesso', icon: CreditCard, path: '/creditos' },
    { label: 'Configurações', icon: Settings, path: '/configuracoes' },
  ];

  const isItemDisabled = (path: string) => {
    if (!hasCredits && !['/perfil', '/creditos', '/notificacoes'].includes(path)) {
      return true;
    }
    return false;
  };

  const handleNavClick = (path: string) => {
    if (isItemDisabled(path)) {
      navigate('/creditos');
      return;
    }
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  };

  const handleSupportClick = () => {
    openWhatsApp(getSupportWhatsAppUrl(user, location.pathname));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 dark:bg-amber-900/40 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">{alerts[0].message}</p>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 left-0 z-50 h-dvh w-64 sm:w-72 lg:w-64 bg-card border-r border-border flex flex-col transition-transform duration-300',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Header - Fixed at top */}
          <div className="shrink-0 p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={currentLogo} alt="FLUX" className="w-10 h-10 object-contain" />
                <span className="font-brand text-xl text-foreground">FLUX</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* User info - Fixed below header */}
          <div className="shrink-0 p-4 border-b border-border">
            <p className="font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
            <div className="mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full',
                  hasCredits
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    hasCredits ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                />
                {hasCredits ? 'Ativo' : 'Expirado'}
              </span>
            </div>
          </div>

          {/* Navigation - Scrollable middle section */}
          <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item: any) => {
              const isActive = location.pathname === item.path;
              const disabled = isItemDisabled(item.path);
              const isEmergency = item.isEmergency;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isEmergency
                      ? isActive
                        ? 'bg-red-600 text-white'
                        : 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                    disabled && 'opacity-50'
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isEmergency && !isActive && "text-red-600")} />
                  <span className="truncate">{item.label}</span>
                  {disabled && (
                    <span className="ml-auto text-xs shrink-0">🔒</span>
                  )}
                </button>
              );
            })}

            {/* Bottom navigation items - inside scrollable area but above logout */}
            <div className="pt-3 mt-3 border-t border-border space-y-1">
              {bottomItems.map((item) => {
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto shrink-0 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* WhatsApp support */}
              <button
                onClick={handleSupportClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <MessageCircle className="h-5 w-5 shrink-0" />
                <span className="truncate">Suporte</span>
              </button>
            </div>
          </nav>

          {/* Logout - Fixed at bottom */}
          <div className="shrink-0 p-3 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="truncate">Sair</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full max-w-full flex flex-col min-h-screen overflow-x-hidden">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border p-3 lg:hidden w-full max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <img src={currentLogo} alt="FLUX" className="w-7 h-7 object-contain" />
                <span className="font-brand text-base">FLUX</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    hasCredits ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigate('/notificacoes')}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 w-full max-w-full p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            <div className="w-full max-w-full overflow-x-hidden">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
