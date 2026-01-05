import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { openInstitutionalSite } from '@/lib/externalLinks';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export const ExpiredCreditBanner = () => {
  const { user, hasCredits } = useAuth();

  if (!user || hasCredits) return null;

  const handleAddCredits = () => {
    openInstitutionalSite();
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl p-4 shadow-lg animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-white/20 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">🚫 Seu acesso está pausado</p>
            <p className="text-sm text-white/90">
              Consulte as opções no nosso site para retomar o uso.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto bg-white text-amber-600 hover:bg-white/90"
          onClick={handleAddCredits}
        >
          <ExternalLink className="h-4 w-4" />
          Ver opções no site
        </Button>
      </div>
    </div>
  );
};
