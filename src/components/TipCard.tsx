import { Lightbulb, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TipCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  dismissable?: boolean;
  tipKey?: string;
}

export const TipCard = ({ title = 'Dica', children, className, dismissable = true, tipKey }: TipCardProps) => {
  const [showTips, setShowTips] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const globalTips = localStorage.getItem('flux_show_tips');
    if (globalTips === 'false') {
      setShowTips(false);
    }
    
    if (tipKey) {
      const dismissedTips = JSON.parse(localStorage.getItem('flux_dismissed_tips') || '[]');
      if (dismissedTips.includes(tipKey)) {
        setDismissed(true);
      }
    }
  }, [tipKey]);

  const handleDismiss = () => {
    if (tipKey) {
      const dismissedTips = JSON.parse(localStorage.getItem('flux_dismissed_tips') || '[]');
      dismissedTips.push(tipKey);
      localStorage.setItem('flux_dismissed_tips', JSON.stringify(dismissedTips));
    }
    setDismissed(true);
  };

  if (!showTips || dismissed) return null;

  return (
    <div className={cn(
      "relative p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800",
      className
    )}>
      {dismissable && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-amber-100 rounded-full transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 pr-4">
          <p className="font-medium text-sm mb-1">{title}</p>
          <div className="text-xs">{children}</div>
        </div>
      </div>
    </div>
  );
};
