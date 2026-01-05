import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/hooks/useReports';

interface StatusIndicatorProps {
  status: ReportStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<ReportStatus, { color: string; label: string; bgColor: string }> = {
  in_progress: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Em Andamento',
  },
  pending: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
    label: 'Pendente',
  },
  overdue: {
    color: 'bg-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
    label: 'Atrasado',
  },
  paid: {
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    label: 'Pago',
  },
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const StatusIndicator = ({ status, size = 'md', showLabel = false }: StatusIndicatorProps) => {
  const config = statusConfig[status];
  
  if (showLabel) {
    return (
      <span className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap',
        config.bgColor,
      )}>
        <span className={cn('rounded-full animate-pulse', sizeClasses[size], config.color)} />
        {config.label}
      </span>
    );
  }
  
  return (
    <span 
      className={cn('rounded-full animate-pulse', sizeClasses[size], config.color)}
      title={config.label}
    />
  );
};
