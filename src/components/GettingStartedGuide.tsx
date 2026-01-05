import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  KeyRound,
  Bell,
  User,
  Truck,
  CreditCard,
  Shield,
} from 'lucide-react';

type Role = 'company' | 'driver';

interface GettingStartedGuideProps {
  userId: string;
  role: Role;
  hasCredits: boolean;
}

type GuideItem = {
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const GettingStartedGuide = ({ userId, role, hasCredits }: GettingStartedGuideProps) => {
  const navigate = useNavigate();
  const storageKey = `flux_getting_started_v1_dismissed_${userId}_${role}`;

  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === 'true');
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const items: GuideItem[] = useMemo(() => {
    if (role === 'company') {
      return [
        {
          title: 'Complete seu perfil (cidade)',
          description: 'A cidade define a região dos pedidos e das notificações.',
          path: '/perfil',
          icon: User,
        },
        {
          title: 'Crie um pedido',
          description: 'Adicione as entregas e aguarde o entregador aceitar.',
          path: '/novo-pedido',
          icon: Truck,
        },
        {
          title: 'Acompanhe em “Meus Pedidos”',
          description: 'Veja status, entregador e detalhes de cada pedido.',
          path: '/meus-pedidos',
          icon: CheckCircle2,
        },
        {
          title: 'Códigos (antifraude)',
          description: 'Após o aceite, os códigos por entrega aparecem e podem ser enviados ao cliente.',
          path: '/codigos-entrega',
          icon: KeyRound,
        },
        {
          title: 'Relatórios e fechamentos mensais',
          description: 'Use relatórios para acompanhar volume, valores e controle mensal.',
          path: '/relatorios',
          icon: FileText,
        },
      ];
    }

    return [
      {
        title: 'Complete seu perfil (cidade)',
        description: 'Sua cidade define quais pedidos disponíveis você verá.',
        path: '/perfil',
        icon: User,
      },
      {
        title: 'Ative notificações',
        description: 'Receba alertas de novos pedidos e mudanças de status.',
        path: '/configuracoes',
        icon: Bell,
      },
      {
        title: 'Veja pedidos disponíveis',
        description: 'Aceite um pedido e vá direto para os detalhes.',
        path: '/pedidos-disponiveis',
        icon: Truck,
      },
      {
        title: 'Valide entregas com código',
        description: 'No momento da entrega, valide o código de 6 dígitos recebido pelo cliente.',
        path: '/meus-pedidos',
        icon: Shield,
      },
      {
        title: 'Relatórios e fechamentos mensais',
        description: 'Acompanhe seus concluídos e resultados por período.',
        path: '/relatorios',
        icon: FileText,
      },
    ];
  }, [role]);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div className="card-static p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Bem-vindo ao FLUX</h2>
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
              0% taxas sobre as entregas
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Um fluxo simples: criar/aceitar → acompanhar → validar com código → acompanhar relatórios e fechamento mensal.
          </p>
          {!hasCredits && (
            <p className="text-sm text-muted-foreground mt-1">
              Dica: na aba “Acesso”, você gerencia seu plano para liberar as funcionalidades.
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="shrink-0">
          Dispensar
        </Button>
      </div>

      <div className="mt-4">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {open ? 'Ocultar guia' : 'Ver guia rápido'}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-3 space-y-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Pedidos:</span> acompanhe o status (pendente, aceito, finalizado) e os detalhes.
              </p>
              <p>
                <span className="font-medium text-foreground">Códigos (antifraude):</span> cada entrega tem um código; o cliente informa ao entregador no recebimento.
              </p>
              <p>
                <span className="font-medium text-foreground">Relatórios:</span> veja resultados por período e use isso no controle/fechamento mensal.
              </p>
              <p>
                <span className="font-medium text-foreground">Notificações:</span> avisos de novos pedidos e mudanças importantes.
              </p>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-foreground mb-2">Primeiros passos</h3>
              <div className="grid gap-2">
                {items.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'w-full text-left rounded-lg border border-border bg-background p-3 hover:bg-secondary/30 transition-colors',
                      'flex items-start gap-3'
                    )}
                  >
                    <div className="mt-0.5">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => navigate('/creditos')}
                  className={cn(
                    'w-full text-left rounded-lg border border-border bg-background p-3 hover:bg-secondary/30 transition-colors',
                    'flex items-start gap-3'
                  )}
                >
                  <div className="mt-0.5">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">Acesso (planos)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Gerencie seu acesso para liberar criação/aceite e recursos do app.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
