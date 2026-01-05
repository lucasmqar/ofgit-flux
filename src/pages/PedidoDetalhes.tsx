import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useDriverOrders, useOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useDriverProfile } from '@/hooks/useDriverProfiles';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useOrderRating } from '@/hooks/useOrderRating';
import { RatingModal } from '@/components/RatingModal';
import { DeliveryCodeValidation } from '@/components/DeliveryCodeValidation';
import { DeliveryCodeDisplay } from '@/components/DeliveryCodeDisplay';
import { formatBrasiliaDateShort, PACKAGE_TYPE_LABELS } from '@/types';
import { formatOrderCode } from '@/lib/utils';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  MessageCircle,
  Eye,
  Building2,
  User,
  Package,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  Shield,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const PedidoDetalhes = () => {
  const { user, hasCredits } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [openDeliveries, setOpenDeliveries] = useState<string[]>(['0']);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: order, isLoading } = useOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();
  const { data: driverOrders = [] } = useDriverOrders(user?.id);

  // Realtime: keep order status/driver + delivery codes in sync on this screen.
  useEffect(() => {
    const orderId = id;
    if (!orderId) return;

    const channel = supabase
      .channel(`pedido-detalhes-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_deliveries',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Perfis
  const { data: driverUserProfile } = useProfile(order?.driver_user_id);
  const { data: driverVehicle } = useDriverProfile(order?.driver_user_id);
  const { data: companyUserProfile } = useProfile(order?.company_user_id);
  const { data: companyDetails } = useCompanyProfile(order?.company_user_id);

  // Verificar se já avaliou
  const toUserId = user?.role === 'company' ? order?.driver_user_id : order?.company_user_id;
  const { data: existingRating } = useOrderRating(id, user?.id);

  if (!user) return null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  const toggleDelivery = (index: string) => {
    setOpenDeliveries(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleWhatsAppCustomer = (customerPhone?: string | null, customerName?: string | null) => {
    if (!customerPhone) return;

    const phone = customerPhone.replace(/\D/g, '');
    const orderCode = formatOrderCode(order.id);
    const greeting = customerName?.trim() ? `Olá ${customerName.trim()}!` : 'Olá!';

    const message =
      user.role === 'driver'
        ? `${greeting}\n\nSou entregador da FLUX. Estou com seu pedido ${orderCode} e preciso confirmar uma informação da entrega. Pode me responder por aqui, por favor?`
        : `${greeting}\n\nSou da empresa responsável pelo pedido ${orderCode}. Preciso confirmar uma informação da entrega. Pode me responder por aqui, por favor?`;

    openWhatsApp(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`);
  };

  const handleWhatsAppDriver = () => {
    if (driverUserProfile?.phone) {
      const url = `https://wa.me/55${driverUserProfile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sou da empresa do pedido ${formatOrderCode(order.id)}`)}`;
      openWhatsApp(url);
    }
  };

  const handleWhatsAppCompany = () => {
    if (companyUserProfile?.phone) {
      const url = `https://wa.me/55${companyUserProfile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sou o entregador do pedido ${formatOrderCode(order.id)}`)}`;
      openWhatsApp(url);
    }
  };

  const handleConfirmReceived = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        status: 'completed',
      });
      toast.success('Entrega confirmada!');
    } catch (error) {
      toast.error('Erro ao confirmar entrega');
    }
  };

  const handleDriverComplete = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        status: 'driver_completed',
      });
      toast.success('Pedido finalizado! Aguardando confirmação da empresa.');
    } catch (error) {
      toast.error('Erro ao finalizar pedido');
    }
  };

  const driverHasOrderInProgress =
    user?.role === 'driver' &&
    driverOrders.some((o: any) => o.status === 'accepted');

  const handleAccept = async () => {
    if (driverHasOrderInProgress) {
      toast.error('Finalize sua entrega atual antes de aceitar outro pedido');
      return;
    }

    if (!hasCredits) {
      toast.error('Acesso necessário para aceitar pedidos');
      navigate('/creditos');
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        status: 'accepted',
        driverUserId: user.id,
      });
      toast.success('Pedido aceito!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao aceitar pedido');
    }
  };

  const handleCancel = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        status: 'cancelled',
      });
      toast.success('Pedido cancelado');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao cancelar pedido');
    }
  };

  const vehicleIcons: Record<string, string> = {
    moto: '🏍️',
    car: '🚗',
    bike: '🚲',
  };

  const isCompleted = order.status === 'completed';
  const canRate = isCompleted && toUserId && !existingRating;
  const roleLabel = user.role === 'company' ? 'entregador' : 'empresa';
  const toUserName = user.role === 'company' 
    ? driverUserProfile?.name 
    : (companyDetails?.company_name || companyUserProfile?.name);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Pedido {formatOrderCode(order.id)}
            </h1>
            <p className="text-muted-foreground text-sm">{formatBrasiliaDateShort(new Date(order.created_at))}</p>
            <div className="mt-2">
              <StatusBadge status={order.status} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-semibold text-foreground">R$ {order.total_value.toFixed(2)}</p>
          </div>
        </div>

        {/* Company info (for driver) */}
        {user.role === 'driver' && (
          <div className="card-static p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {companyDetails?.company_name || companyUserProfile?.name}
                </p>
                {companyDetails?.address_default && (
                  <p className="text-sm text-muted-foreground">{companyDetails.address_default}</p>
                )}
                {companyUserProfile?.phone && (
                  <p className="text-sm text-muted-foreground">{companyUserProfile.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/usuario/${order.company_user_id}`)}
                >
                  <Eye className="h-4 w-4" />
                  Ver perfil
                </Button>

                {['accepted', 'driver_completed'].includes(order.status) && companyUserProfile?.phone && (
                  <Button
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                    onClick={handleWhatsAppCompany}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Driver info (for company) */}
        {user.role === 'company' && driverUserProfile && (
          <div className="card-static p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{driverUserProfile.name}</p>
                {driverVehicle && (
                  <p className="text-sm text-muted-foreground">
                    {vehicleIcons[driverVehicle.vehicle_type] || '🚗'} {driverVehicle.vehicle_model} • {driverVehicle.plate}
                  </p>
                )}
                {driverUserProfile.phone && (
                  <p className="text-sm text-muted-foreground">{driverUserProfile.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {order.driver_user_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/usuario/${order.driver_user_id}`)}
                  >
                    <Eye className="h-4 w-4" />
                    Ver perfil
                  </Button>
                )}

                {['accepted', 'driver_completed'].includes(order.status) && driverUserProfile.phone && (
                  <Button
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                    onClick={handleWhatsAppDriver}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rating section for completed orders */}
        {isCompleted && (
          <div className="card-static p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 dark:from-amber-900/30 dark:to-amber-900/20 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-300">
                    {existingRating ? 'Você já avaliou' : 'Avalie sua experiência'}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {existingRating 
                      ? `Você deu ${existingRating.stars} estrela${existingRating.stars > 1 ? 's' : ''}`
                      : `Como foi a entrega com ${toUserName}?`
                    }
                  </p>
                </div>
              </div>
              {canRate && (
                <Button onClick={() => setRatingModalOpen(true)}>
                  Avaliar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Deliveries */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Entregas ({order.order_deliveries?.length || 0})
          </h2>
          
          {order.order_deliveries?.map((delivery: any, index: number) => {
            const isValidated = !!delivery.validated_at;
            const validationAttempts = delivery.validation_attempts || 0;
            
            return (
              <Collapsible 
                key={delivery.id} 
                open={openDeliveries.includes(String(index))}
                onOpenChange={() => toggleDelivery(String(index))}
              >
                <div className="card-static overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">
                          {PACKAGE_TYPE_LABELS[delivery.package_type as keyof typeof PACKAGE_TYPE_LABELS]}
                        </p>
                        <p className="text-sm text-muted-foreground">R$ {delivery.suggested_price.toFixed(2)}</p>
                      </div>
                      {/* Validation status badge */}
                      {order.status !== 'pending' && (
                        <div className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isValidated 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isValidated ? 'Validado' : 'Pendente'}
                        </div>
                      )}
                    </div>
                    {openDeliveries.includes(String(index)) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Retirada</p>
                          <p className="text-sm text-foreground">{delivery.pickup_address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Entrega</p>
                          <p className="text-sm text-foreground">{delivery.dropoff_address}</p>
                        </div>
                      </div>
                      {delivery.notes && (
                        <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
                          <strong>Obs:</strong> {delivery.notes}
                        </div>
                      )}

                      {/* Customer info for driver (only after accept) */}
                      {user.role === 'driver' && order.status === 'accepted' && (delivery.customer_name || delivery.customer_phone) && (
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm min-w-0">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="font-medium text-blue-900 dark:text-blue-300 shrink-0">Cliente:</span>
                              <span className="text-blue-700 dark:text-blue-400 truncate">
                                {[delivery.customer_name?.trim(), delivery.customer_phone?.trim()].filter(Boolean).join(' - ')}
                              </span>
                            </div>

                            {delivery.customer_phone && (
                              <Button
                                size="sm"
                                className="bg-[#25D366] hover:bg-[#20BD5A] text-white shrink-0"
                                onClick={() => handleWhatsAppCustomer(delivery.customer_phone, delivery.customer_name)}
                              >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Customer info for company */}
                      {user.role === 'company' && (delivery.customer_name || delivery.customer_phone) && (
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm min-w-0">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="font-medium text-blue-900 dark:text-blue-300 shrink-0">Cliente:</span>
                              <span className="text-blue-700 dark:text-blue-400 truncate">
                                {[delivery.customer_name?.trim(), delivery.customer_phone?.trim()].filter(Boolean).join(' - ')}
                              </span>
                            </div>

                            {delivery.customer_phone && (
                              <Button
                                size="sm"
                                className="bg-[#25D366] hover:bg-[#20BD5A] text-white shrink-0"
                                onClick={() => handleWhatsAppCustomer(delivery.customer_phone, delivery.customer_name)}
                              >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Company: Show delivery code - ALWAYS VISIBLE after driver accepts */}
                      {user.role === 'company' && order.status !== 'pending' && delivery.delivery_code && (
                        <DeliveryCodeDisplay
                          code={delivery.delivery_code}
                          deliveryIndex={index}
                          customerPhone={delivery.customer_phone}
                          customerName={delivery.customer_name}
                          isValidated={isValidated}
                          codeSentAt={delivery.code_sent_at}
                          alwaysVisible={true}
                        />
                      )}
                      
                      {/* Driver: Show code validation */}
                      {user.role === 'driver' && order.status === 'accepted' && delivery.code_hash && (
                        <DeliveryCodeValidation
                          deliveryId={delivery.id}
                          driverUserId={user.id}
                          isValidated={isValidated}
                          validationAttempts={validationAttempts}
                        />
                      )}
                      
                      {/* Validation attempts info */}
                      {validationAttempts > 0 && !isValidated && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          {validationAttempts} tentativa{validationAttempts !== 1 ? 's' : ''} de validação
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Info about validation for drivers */}
        {user.role === 'driver' && order.status === 'accepted' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300">Sistema Antifraude</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Para finalizar cada entrega, valide o código de 6 dígitos que o cliente recebeu. 
                Você tem até 5 tentativas por entrega.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-4">
          {/* Driver actions */}
          {user.role === 'driver' && order.status === 'pending' && (
            <Button 
              size="lg" 
              className="w-full" 
              onClick={handleAccept}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Aceitar Pedido
            </Button>
          )}
          
          {user.role === 'driver' && order.status === 'accepted' && (() => {
            const allValidated = order.order_deliveries?.every((d: any) => !!d.validated_at) ?? false;
            const pendingCount = order.order_deliveries?.filter((d: any) => !d.validated_at).length ?? 0;
            
            return (
              <div className="space-y-2">
                {!allValidated && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <p className="font-medium">⚠️ {pendingCount} entrega(s) pendente(s) de validação</p>
                    <p className="text-xs mt-1">Valide todas as entregas com os códigos dos clientes antes de finalizar.</p>
                  </div>
                )}
                <Button 
                  size="lg" 
                  className="w-full" 
                  onClick={handleDriverComplete}
                  disabled={updateStatusMutation.isPending || !allValidated}
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Finalizar Pedido
                </Button>
              </div>
            );
          })()}

          {/* Company actions */}
          {user.role === 'company' && order.status === 'driver_completed' && (
            <Button 
              size="lg" 
              className="w-full" 
              onClick={handleConfirmReceived}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Confirmar Recebimento
            </Button>
          )}
          
          {user.role === 'company' && order.status === 'pending' && (
            <Button 
              variant="destructive" 
              size="lg" 
              className="w-full" 
              onClick={handleCancel}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Cancelar Pedido'
              )}
            </Button>
          )}

          <Button variant="outline" size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>

      {/* Rating Modal */}
      {toUserId && toUserName && (
        <RatingModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          orderId={order.id}
          fromUserId={user.id}
          toUserId={toUserId}
          toUserName={toUserName}
          roleLabel={roleLabel}
        />
      )}
    </AppLayout>
  );
};

export default PedidoDetalhes;
