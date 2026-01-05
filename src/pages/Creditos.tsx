import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { CreditsBadge } from '@/components/CreditsBadge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowLeft, Clock, Gift, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { openInstitutionalSite } from '@/lib/externalLinks';

const Creditos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleOpenSite = () => {
    openInstitutionalSite();
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 overflow-x-hidden pb-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Acesso</h1>
            <p className="text-muted-foreground">Gerencie seu acesso ao FLUX</p>
          </div>
        </div>

        {/* Current status */}
        <div className="card-static p-6 animate-fade-in">
          <h3 className="text-lg font-semibold text-foreground mb-4">Status Atual</h3>
          <CreditsBadge size="lg" />
        </div>

        {/* How it works */}
        <div className="card-static p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Clock className="h-5 w-5 text-blue-800 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Como funciona?</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• Cada período de acesso libera <strong className="text-foreground">24 horas</strong> de uso contínuo</p>
            <p>• O período é consumido apenas quando você tem um pedido em andamento</p>
            <p>• Sem acesso ativo, o uso fica pausado (exceto esta tela e seu perfil)</p>
          </div>
        </div>

        {/* Add credits */}
        <div className="card-static p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Gift className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Planos e Acesso</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Acesse nosso site para conhecer os planos e liberar o acesso.
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={handleOpenSite}
          >
            <ExternalLink className="h-5 w-5" />
            Ver planos no site
          </Button>
        </div>

        {/* Support and Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-static p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Suporte</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Dúvidas sobre acesso? Acesse nosso site.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOpenSite}
            >
              <ExternalLink className="h-4 w-4" />
              Acessar Site
            </Button>
          </div>
          <div className="card-static p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-foreground">Dica</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              O acesso é consumido apenas quando você tem pedidos ativos.
              Sem pedidos, o acesso fica pausado.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Creditos;
