import { OrderStatus, ORDER_STATUS_LABELS } from '@/types';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<OrderStatus, { 
  label: string; 
  icon: LucideIcon; 
  className: string;
}> = {
  pending: {
    label: 'Aguardando',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  },
  accepted: {
    label: 'Aceito',
    icon: Package,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  },
  driver_completed: {
    label: 'Entregue',
    icon: Truck,
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

const iconSizes = {
  sm: 12,
  md: 14,
  lg: 16,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showIcon = true 
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
};
