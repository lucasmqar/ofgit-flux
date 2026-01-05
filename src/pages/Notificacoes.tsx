import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { getUserNotifications } from '@/data/mockData';
import { formatBrasiliaDateShort, NotificationTag } from '@/types';
import { 
  ArrowLeft, 
  Bell,
  Package,
  CreditCard,
  User,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tagConfig: Record<NotificationTag, { label: string; icon: React.ElementType; className: string }> = {
  deliveries: {
    label: 'Entregas',
    icon: Package,
    className: 'bg-blue-100 text-blue-800',
  },
  credits: {
    label: 'Créditos',
    icon: CreditCard,
    className: 'bg-emerald-100 text-emerald-800',
  },
  account: {
    label: 'Conta',
    icon: User,
    className: 'bg-purple-100 text-purple-800',
  },
};

const Notificacoes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const notifications = getUserNotifications(user.id);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notificações</h1>
            <p className="text-muted-foreground">{notifications.length} notificações</p>
          </div>
        </div>

        {/* Notifications list */}
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const config = tagConfig[notification.tag];
            const TagIcon = config.icon;
            const isRead = !!notification.readAt;

            return (
              <div
                key={notification.id}
                className={cn(
                  'card-static p-4 opacity-0 animate-fade-in',
                  !isRead && 'border-l-4 border-l-primary'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', config.className)}>
                    <TagIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.className)}>
                        {config.label}
                      </span>
                      {isRead && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-medium text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatBrasiliaDateShort(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Notificacoes;
