import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CreditsBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showExpiry?: boolean;
}

export const CreditsBadge: React.FC<CreditsBadgeProps> = ({
  size = 'md',
  showExpiry = true,
}) => {
  const { credits, hasCredits } = useAuth();
  const isActive = hasCredits;
  const validUntil = credits ? new Date(credits.validUntil) : new Date();
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  };

  const getDaysRemaining = (): number => {
    if (!credits) return 0;
    const now = new Date();
    const diff = new Date(credits.validUntil).getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-semibold rounded-full',
            sizeClasses[size],
            isActive
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
          )}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            )}
          />
          {isActive ? 'ATIVO' : 'EXPIRADO'}
        </span>
        {isActive && (
          <span className="text-sm text-muted-foreground">
            {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      {showExpiry && credits && (
        <p className="text-xs text-muted-foreground">
          {isActive ? 'Válido até: ' : 'Expirou em: '}
          <span className="font-medium">{formatDate(validUntil)}</span>
        </p>
      )}
    </div>
  );
};
