import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClickableStatsCardProps {
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
  href?: string;
}

export const ClickableStatsCard = forwardRef<HTMLDivElement, ClickableStatsCardProps>(
  ({ title, value, icon: Icon, description, trend, className, iconClassName, delay = 0, href }, ref) => {
    const navigate = useNavigate();

    const handleClick = () => {
      if (href) {
        navigate(href);
      }
    };

    return (
      <div
        ref={ref}
        onClick={handleClick}
        className={cn(
          'card-static p-5 flex flex-col gap-3 opacity-0 animate-fade-in',
          href && 'cursor-pointer hover:shadow-md hover:border-primary/20 transition-all',
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

ClickableStatsCard.displayName = 'ClickableStatsCard';
