import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { getSupportWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';
import { openInstitutionalSite } from '@/lib/externalLinks';
import { Lock, ExternalLink, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import logoClaro from '@/assets/logo_tclaro.png';
import logoEscuro from '@/assets/logo_tescuro.png';

export const BlockedScreen = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { resolvedTheme } = useTheme();

  const currentLogo = resolvedTheme === 'dark' ? logoEscuro : logoClaro;

  if (!user) return null;

  const handleAddCredits = () => {
    openInstitutionalSite();
  };

  const handleSupport = () => {
    openWhatsApp(getSupportWhatsAppUrl(user, location.pathname));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={currentLogo} alt="FLUX" className="w-20 h-20 object-contain" />
        </div>

        {/* Lock icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Acesso pausado</h1>
          <p className="text-muted-foreground">
            Para continuar usando o FLUX, consulte as opções no nosso site.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="default"
            size="xl"
            className="w-full"
            onClick={handleAddCredits}
          >
            <ExternalLink className="h-5 w-5" />
            Ver opções no site
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleSupport}
          >
            <HelpCircle className="h-5 w-5" />
            Falar com Suporte
          </Button>
        </div>

        {/* Credit explanation */}
        <p className="text-sm text-muted-foreground">
          Cada período de acesso libera <strong className="text-foreground">24 horas</strong> de uso contínuo.
        </p>
      </div>
    </div>
  );
};
