import { Building2, User, Calendar, Clock } from 'lucide-react';
import { usePaymentHistory } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getMonthName = (monthStr: string): string => {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
};

export const PaymentHistoryList = () => {
  const { user } = useAuth();
  const { data: history, isLoading } = usePaymentHistory();
  const isDriver = user?.role === 'driver';
  
  if (isLoading) {
    return (
      <div className="space-y-3 w-full max-w-full overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-static p-4 w-full max-w-full overflow-hidden">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    );
  }
  
  if (!history || history.length === 0) {
    return (
      <div className="card-static p-8 text-center w-full max-w-full overflow-hidden">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        {isDriver && (
          <p className="text-sm text-muted-foreground mt-1">
            Marque seus pedidos como pagos para vê-los aqui.
          </p>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-3 w-full max-w-full overflow-x-hidden" style={{maxWidth: '100%'}}>
      {history.map((item: any) => (
        <div key={item.id} className="card-static p-3 w-full max-w-full overflow-x-hidden" style={{maxWidth: '100%'}}>
          <div className="flex items-start justify-between gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                {isDriver ? (
                  <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="font-medium text-foreground truncate">
                  {isDriver ? item.company_name : item.driver_name}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap overflow-hidden">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span className="truncate">Ref: {getMonthName(item.payment_month)}</span>
                  <span className="text-muted shrink-0">•</span>
                  <span className="truncate">{item.order_count} ped.</span>
                </div>
              </div>
            </div>
            
            <div className="text-right shrink-0 overflow-hidden">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm truncate">
                {formatCurrency(Number(item.total_value))}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {formatDateTime(item.marked_at)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
