import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/hooks/useReports';

interface ReportStatusTabsProps {
  activeTab: ReportStatus | 'all';
  onTabChange: (tab: ReportStatus | 'all') => void;
  counts: {
    all: number;
    in_progress: number;
    pending: number;
    overdue: number;
    paid: number;
  };
}

const tabs: Array<{ id: ReportStatus | 'all'; label: string; color: string }> = [
  { id: 'all', label: 'Todos', color: 'bg-muted-foreground' },
  { id: 'in_progress', label: 'Em Andamento', color: 'bg-blue-500' },
  { id: 'pending', label: 'Pendentes', color: 'bg-yellow-500' },
  { id: 'overdue', label: 'Atrasados', color: 'bg-red-500' },
  { id: 'paid', label: 'Pagos', color: 'bg-emerald-500' },
];

export const ReportStatusTabs = ({ activeTab, onTabChange, counts }: ReportStatusTabsProps) => {
  return (
    <div className="w-full pb-2 overflow-x-hidden" style={{width: '100%', maxWidth: '100%'}}>
      <div className="flex flex-col md:flex-row flex-wrap gap-2" style={{width: '100%', maxWidth: '100%'}}>
        {tabs.map(tab => {
          const count = counts[tab.id];
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors shrink-0',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', isActive ? 'bg-primary-foreground' : tab.color)} />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs shrink-0',
                  isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
