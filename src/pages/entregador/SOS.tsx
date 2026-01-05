import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDriverOrders } from '@/hooks/useOrders';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useProfile } from '@/hooks/useProfile';
import { formatBrasiliaDateShort, WHATSAPP_NUMBER } from '@/types';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  AlertTriangle,
  Package,
  Loader2,
  Send,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn, formatOrderCode } from '@/lib/utils';

const SOS = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: orders = [], isLoading } = useDriverOrders(user?.id);

  if (!user || user.role !== 'driver') return null;

  // Filter only active orders
  // Once the driver completes (driver_completed), they should be free to accept new orders.
  const activeOrders = orders.filter(o => o.status === 'accepted');

  // Fetch company profile for selected order
  const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);
  const { data: companyProfile } = useCompanyProfile(selectedOrder?.company_user_id);
  const { data: companyUserProfile } = useProfile(selectedOrder?.company_user_id);

  const handleSendSOS = () => {
    if (!selectedOrderId) {
      toast.error('Selecione um pedido');
      return;
    }
    if (!description.trim()) {
      toast.error('Descreva o problema');
      return;
    }

    setIsSending(true);

    const orderCode = selectedOrder ? formatOrderCode(selectedOrder.id) : '';
    const companyPhone = companyUserProfile?.phone?.replace(/\D/g, '');
    
    const message = encodeURIComponent(
      `🆘 *SOS - Problema na Entrega*\n\n` +
      `*Entregador:* ${user.name}\n` +
      `*Pedido:* ${orderCode}\n\n` +
      `*Descrição do Problema:*\n${description}\n\n` +
      `---\n_Enviado via app FLUX_`
    );

    // Redirect to company's WhatsApp if available, otherwise use FLUX support
    const targetPhone = companyPhone ? `55${companyPhone}` : WHATSAPP_NUMBER;
    window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank');
    
    toast.success('WhatsApp aberto para envio do SOS');
    setIsSending(false);
    
    // Reset form
    setDescription('');
    setSelectedOrderId('');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">SOS - Suporte</h1>
              <p className="text-muted-foreground">Reportar problema com entrega</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Precisa de ajuda urgente?
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Preencha o formulário abaixo para reportar um problema com sua entrega. 
                Nossa equipe de suporte irá atendê-lo o mais rápido possível via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card-static p-6 space-y-6">
          {/* Order Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Selecione o pedido com problema
            </Label>
            
            {activeOrders.length === 0 ? (
              <div className="p-4 rounded-lg bg-secondary/50 text-center">
                <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Você não tem pedidos ativos no momento
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      selectedOrderId === order.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border bg-background hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          selectedOrderId === order.id ? "bg-primary/10" : "bg-secondary"
                        )}>
                          <Package className={cn(
                            "h-5 w-5",
                            selectedOrderId === order.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">
                            Pedido {formatOrderCode(order.id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatBrasiliaDateShort(new Date(order.created_at))} • 
                            {order.order_deliveries?.length || 0} entrega(s)
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 shrink-0",
                        selectedOrderId === order.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {selectedOrderId === order.id && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Problem Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Descreva o problema
            </Label>
            <Textarea
              id="description"
              placeholder="Explique o que aconteceu com detalhes. Ex: Cliente não está em casa, endereço incorreto, problema com o pacote..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Seja específico para que possamos ajudá-lo melhor.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
            onClick={handleSendSOS}
            disabled={!selectedOrderId || !description.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <MessageCircle className="h-5 w-5 mr-2" />
                Enviar SOS via WhatsApp
              </>
            )}
          </Button>
        </div>

        {/* Direct Contact */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Ou entre em contato diretamente:
          </p>
          <Button
            variant="outline"
            onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
          >
            <Phone className="h-4 w-4 mr-2" />
            Ligar para Suporte
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default SOS;
