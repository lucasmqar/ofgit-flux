import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportSummary } from '@/hooks/useReports';

interface ReportSummaryCardsProps {
  summary: ReportSummary;
  role: 'driver' | 'company';
  isLoading?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const ReportSummaryCards = ({ summary, role, isLoading }: ReportSummaryCardsProps) => {
  if (role === 'driver') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-full overflow-x-hidden" style={{ maxWidth: '100%' }}>
        {/* Valor Pendente */}
        <div className="card-static p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 shrink-0">
              <Wallet className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">Valor Pendente</span>
          </div>
          <p className={cn(
            "text-xl sm:text-2xl font-bold text-foreground",
            isLoading && "animate-pulse bg-muted rounded h-8 w-32"
          )}>
            {!isLoading && formatCurrency(summary.pendingValue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.pendingCount} pedido(s)
          </p>
        </div>

        {/* Valor Pago (Mês) */}
        <div className="card-static p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">Recebido (Mês)</span>
          </div>
          <p className={cn(
            "text-xl sm:text-2xl font-bold text-foreground",
            isLoading && "animate-pulse bg-muted rounded h-8 w-32"
          )}>
            {!isLoading && formatCurrency(summary.paidValue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.paidCount} pedido(s)
          </p>
        </div>

        {/* Acumulado Geral */}
        <div className="card-static p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">Acumulado</span>
          </div>
          <p className={cn(
            "text-xl sm:text-2xl font-bold text-foreground",
            isLoading && "animate-pulse bg-muted rounded h-8 w-32"
          )}>
            {!isLoading && formatCurrency(summary.totalValue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.totalCount} entrega(s)
          </p>
        </div>

        {/* Economia FLUX */}
        <div className="card-static p-3 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
              <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">Economia FLUX</span>
          </div>
          <p className={cn(
            "text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400",
            isLoading && "animate-pulse bg-muted rounded h-8 w-32"
          )}>
            {!isLoading && formatCurrency(summary.estimatedSavings || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            25% economia
          </p>
        </div>
      </div>
    );
  }

  // Company view
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-full overflow-x-hidden" style={{maxWidth: '100%'}}>
      {/* Total Gasto */}
      <div className="card-static p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
            <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">Total em Entregas</span>
        </div>
        <p className={cn(
          "text-xl sm:text-2xl font-bold text-foreground",
          isLoading && "animate-pulse bg-muted rounded h-8 w-32"
        )}>
          {!isLoading && formatCurrency(summary.projectedSpending || summary.totalValue)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {summary.totalCount} entrega(s)
        </p>
      </div>

      {/* Economia Estimada */}
      <div className="card-static p-3 border-2 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
            <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">Economia FLUX</span>
        </div>
        <p className={cn(
          "text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400",
          isLoading && "animate-pulse bg-muted rounded h-8 w-32"
        )}>
          {!isLoading && formatCurrency(summary.estimatedSavings || 0)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          25% economia
        </p>
      </div>

      {/* Entregas Realizadas */}
      <div className="card-static p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 shrink-0">
            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words">Entregas</span>
        </div>
        <p className={cn(
          "text-xl sm:text-2xl font-bold text-foreground",
          isLoading && "animate-pulse bg-muted rounded h-8 w-32"
        )}>
          {!isLoading && summary.totalCount}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Total concluídas
        </p>
      </div>
    </div>
  );
};
