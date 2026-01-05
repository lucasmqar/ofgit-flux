import { Button } from '@/components/ui/button';
import { WHATSAPP_BASE_URL } from '@/lib/whatsapp';
import { HelpCircle, MessageCircle } from 'lucide-react';

export const DeliveryInProgressBanner = () => {
  const handleClick = () => {
    window.open(WHATSAPP_BASE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-white/20 rounded-lg">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Algum imprevisto na entrega?</p>
            <p className="text-sm text-white/90">
              Fale com o suporte FLUX agora.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto bg-white text-blue-600 hover:bg-white/90"
          onClick={handleClick}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
};
