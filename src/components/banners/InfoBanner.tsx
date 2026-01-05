import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WHATSAPP_BASE_URL } from '@/lib/whatsapp';
import { HelpCircle, Shield, X, MessageCircle } from 'lucide-react';

interface InfoBannerProps {
  variant?: 'default' | 'compact';
}

const tips = [
  { icon: Shield, text: 'Nunca compartilhe seus códigos de entrega com terceiros.' },
  { icon: HelpCircle, text: 'Precisa de suporte? Estamos sempre disponíveis via WhatsApp.' },
  { icon: Shield, text: 'Verifique sempre os dados do pedido antes de confirmar.' },
];

export const InfoBanner = ({ variant = 'default' }: InfoBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed) return null;

  const handleContact = () => {
    window.open(WHATSAPP_BASE_URL, '_blank', 'noopener,noreferrer');
  };

  const currentTip = tips[tipIndex];
  const TipIcon = currentTip.icon;

  if (variant === 'compact') {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TipIcon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{currentTip.text}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={handleContact}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Suporte
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-5 relative animate-fade-in">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1.5 hover:bg-muted rounded-lg transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 bg-primary/10 rounded-xl">
            <TipIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Dica de Segurança</p>
            <p className="text-sm text-muted-foreground">
              {currentTip.text}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleContact}
        >
          <MessageCircle className="h-4 w-4" />
          Falar com Suporte
        </Button>
      </div>
    </div>
  );
};
