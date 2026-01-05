import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
  delay?: number;
}

export const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, icon: Icon, description, trend, className, iconClassName, delay = 0 }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'card-static p-5 flex flex-col gap-3 opacity-0 animate-fade-in',
          className
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          </div>
          <div
            className={cn(
              'p-3 rounded-xl text-foreground',
              iconClassName
            )}
          >
            <Icon className="h-5 w-5 text-current" />
          </div>
        </div>
        
        {(description || trend) && (
          <div className="flex items-center gap-2 text-sm">
            {trend && (
              <span
                className={cn(
                  'font-medium',
                  trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
            {description && (
              <span className="text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

StatsCard.displayName = 'StatsCard';
