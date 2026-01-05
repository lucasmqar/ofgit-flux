import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useCreateOrder } from '@/hooks/useOrders';
import { PACKAGE_TYPE_LABELS, PackageType } from '@/types';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  ShoppingBag,
  Package,
  Box,
  MoreHorizontal,
  Zap,
  Bike,
  Car,
  Phone,
  User,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';

interface DeliveryItem {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageType: PackageType;
  suggestedPrice: number;
  customPrice: string;
  useCustomPrice: boolean;
  notes: string;
  customerName: string;
  customerPhone: string;
  vehicleType: 'moto' | 'car' | 'bike' | null;
}

const packageTypes: { type: PackageType; label: string; icon: React.ElementType }[] = [
  { type: 'envelope', label: 'Envelope', icon: Mail },
  { type: 'bag', label: 'Sacola', icon: ShoppingBag },
  { type: 'small_box', label: 'Caixa Pequena', icon: Package },
  { type: 'large_box', label: 'Caixa Grande', icon: Box },
  { type: 'other', label: 'Outros', icon: MoreHorizontal },
];

const vehicleTypes = [
  { type: 'moto' as const, label: 'Moto', icon: Zap },
  { type: 'bike' as const, label: 'Bicicleta', icon: Bike },
  { type: 'car' as const, label: 'Carro', icon: Car },
];

const priceOptions = [3, 6, 9, 12, 15];

const NovoPedido = () => {
  const { user, hasCredits } = useAuth();
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<string[]>(['1']);
  const [useCustomPickup, setUseCustomPickup] = useState<Record<string, boolean>>({});

  // Fetch company profile for default address
  const { data: companyProfile } = useCompanyProfile(user?.id);
  const createOrderMutation = useCreateOrder();

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([
    {
      id: '1',
      pickupAddress: '',
      dropoffAddress: '',
      packageType: 'bag',
      suggestedPrice: 0,
      customPrice: '',
      useCustomPrice: false,
      notes: '',
      customerName: '',
      customerPhone: '',
      vehicleType: null,
    },
  ]);

  // Set default pickup address when company profile loads
  useEffect(() => {
    if (companyProfile?.address_default && deliveries[0].pickupAddress === '') {
      setDeliveries(prev => prev.map((d, i) => 
        i === 0 && !useCustomPickup[d.id] ? { ...d, pickupAddress: companyProfile.address_default || '' } : d
      ));
    }
  }, [companyProfile?.address_default]);

  if (!user || user.role !== 'company') return null;

  const addDelivery = () => {
    const newId = String(Date.now());
    setDeliveries([
      ...deliveries,
      {
        id: newId,
        pickupAddress: companyProfile?.address_default || '',
        dropoffAddress: '',
        packageType: 'bag',
        suggestedPrice: 0,
        customPrice: '',
        useCustomPrice: false,
        notes: '',
        customerName: '',
        customerPhone: '',
        vehicleType: null,
      },
    ]);
    setOpenItems([...openItems, newId]);
  };

  const removeDelivery = (id: string) => {
    if (deliveries.length === 1) {
      toast.error('O pedido precisa ter pelo menos 1 entrega');
      return;
    }
    setDeliveries(deliveries.filter(d => d.id !== id));
    setOpenItems(openItems.filter(i => i !== id));
  };

  const updateDelivery = (id: string, field: keyof DeliveryItem, value: string | number | null) => {
    setDeliveries(deliveries.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleCustomPickup = (id: string) => {
    setUseCustomPickup(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      if (!newState[id] && companyProfile?.address_default) {
        updateDelivery(id, 'pickupAddress', companyProfile.address_default);
      }
      return newState;
    });
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const getDeliveryPrice = (d: DeliveryItem) => {
    if (d.useCustomPrice && d.customPrice) {
      return parseFloat(d.customPrice) || 0;
    }
    return d.suggestedPrice;
  };

  const totalValue = deliveries.reduce((sum, d) => sum + getDeliveryPrice(d), 0);

  const isValid = deliveries.every(d => 
    d.pickupAddress && 
    d.customerName.trim() && 
    d.customerPhone.replace(/\D/g, '').length >= 10
  );

  const handleSubmit = async () => {
    if (!hasCredits) {
      toast.error('Acesso necessário para criar pedidos');
      navigate('/creditos');
      return;
    }

    if (!companyProfile?.city) {
      toast.error('Defina sua cidade no seu perfil antes de criar pedidos');
      navigate('/completar-perfil');
      return;
    }

    if (!isValid) {
      toast.error('Preencha nome e telefone do cliente para todas as entregas');
      return;
    }

    try {
      const result = await createOrderMutation.mutateAsync({
        order: {
          company_user_id: user.id,
          total_value: totalValue,
          status: 'pending',
          state: companyProfile.state || 'GO',
          city: companyProfile.city,
        },
        deliveries: deliveries.map(d => ({
          pickup_address: d.pickupAddress,
          dropoff_address: d.dropoffAddress || 'A definir',
          package_type: d.packageType,
          notes: d.notes || null,
          suggested_price: getDeliveryPrice(d),
          customer_name: d.customerName,
          customer_phone: d.customerPhone.replace(/\D/g, ''),
        })),
      });
      
      toast.success('Pedido criado com sucesso!');

      // Auto-open order details so updates/codes appear in realtime.
      navigate(`/pedido/${result.order.id}`, { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar pedido');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-0 sm:px-4">
        {/* Header */}
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        {/* Title Card */}
        <div className="card-static p-6 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Novo Pedido</h1>
          <p className="text-muted-foreground text-sm mb-2">Adicione as entregas ao pedido</p>
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-gray-100 border border-blue-200 dark:border-gray-300 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground dark:text-gray-900">
                {deliveries.length} entrega{deliveries.length > 1 ? 's' : ''} no pedido
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-700">Valor total: R$ {totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Deliveries */}
        <form className="space-y-4">
          {deliveries.map((delivery, index) => (
            <Collapsible 
              key={delivery.id}
              open={openItems.includes(delivery.id)}
              onOpenChange={() => toggleItem(delivery.id)}
            >
              <div className="card-static overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      delivery.packageType ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">Entrega #{index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {delivery.packageType ? PACKAGE_TYPE_LABELS[delivery.packageType] : 'Tipo não selecionado'}
                        {delivery.customerName && ` • ${delivery.customerName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {deliveries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDelivery(delivery.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {openItems.includes(delivery.id) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-6 pt-0 space-y-4 border-t border-border">
                    {/* Customer Data - Highlighted Section */}
                    <div className="p-4 bg-blue-50 dark:bg-gray-100 rounded-lg border border-blue-200 dark:border-gray-300">
                      <p className="text-xs font-bold text-blue-900 dark:text-gray-900 uppercase tracking-wide mb-3">
                        Dados do Cliente Final
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-foreground dark:text-gray-800 mb-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Nome do Cliente *
                          </Label>
                          <Input
                            placeholder="Nome completo"
                            value={delivery.customerName}
                            onChange={(e) => updateDelivery(delivery.id, 'customerName', e.target.value)}
                            className="text-sm"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-foreground dark:text-gray-800 mb-1 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Telefone do Cliente *
                          </Label>
                          <Input
                            placeholder="(64) 99999-9999"
                            value={delivery.customerPhone}
                            onChange={(e) => updateDelivery(delivery.id, 'customerPhone', formatPhone(e.target.value))}
                            className="text-sm"
                            required
                          />
                        </div>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-gray-700 mt-2">
                        ℹ️ O código de validação será enviado automaticamente para este telefone
                      </p>
                    </div>

                    {/* Pickup Address */}
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                        Endereço de Retirada
                      </Label>
                      {!useCustomPickup[delivery.id] && companyProfile?.address_default ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-blue-50 dark:bg-gray-100 rounded-lg border border-blue-200 dark:border-gray-300">
                            <p className="text-sm text-foreground dark:text-gray-900 font-semibold">{companyProfile.address_default}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-700 mt-1">Endereço padrão</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCustomPickup(delivery.id)}
                            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                          >
                            ▸ Usar outro endereço
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder="Endereço de retirada"
                            value={delivery.pickupAddress}
                            onChange={(e) => updateDelivery(delivery.id, 'pickupAddress', e.target.value)}
                          />
                          {companyProfile?.address_default && (
                            <button
                              type="button"
                              onClick={() => toggleCustomPickup(delivery.id)}
                              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                            >
                              ▸ Usar endereço padrão
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dropoff Address */}
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                        Endereço de Entrega <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        placeholder="Endereço de destino"
                        value={delivery.dropoffAddress}
                        onChange={(e) => updateDelivery(delivery.id, 'dropoffAddress', e.target.value)}
                      />
                    </div>

                    {/* Package Type */}
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 block">
                        Tipo de Entrega *
                      </Label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {packageTypes.map(({ type, label, icon: Icon }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateDelivery(delivery.id, 'packageType', type)}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border-2 transition-all min-h-[70px]",
                              delivery.packageType === type
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-muted-foreground hover:bg-secondary/50"
                            )}
                            title={label}
                          >
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
                            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vehicle Type */}
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 block">
                        Tipo de Veículo <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {vehicleTypes.map(({ type, label, icon: Icon }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateDelivery(delivery.id, 'vehicleType', delivery.vehicleType === type ? null : type)}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border-2 transition-all min-h-[70px]",
                              delivery.vehicleType === type
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-muted-foreground hover:bg-secondary/50"
                            )}
                          >
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
                            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 block">
                        Valor da Entrega <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <div className="grid grid-cols-6 gap-2">
                        {priceOptions.map((price) => (
                          <button
                            key={price}
                            type="button"
                            onClick={() => {
                              setDeliveries(deliveries.map(d => 
                                d.id === delivery.id 
                                  ? { ...d, suggestedPrice: d.suggestedPrice === price ? 0 : price, useCustomPrice: false, customPrice: '' }
                                  : d
                              ));
                            }}
                            className={cn(
                              "py-3 rounded-lg border-2 font-bold transition-all",
                              !delivery.useCustomPrice && delivery.suggestedPrice === price
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-muted-foreground hover:bg-secondary/50"
                            )}
                          >
                            R$ {price}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDeliveries(deliveries.map(d => 
                              d.id === delivery.id 
                                ? { ...d, useCustomPrice: true, suggestedPrice: 0 }
                                : d
                            ));
                          }}
                          className={cn(
                            "py-3 rounded-lg border-2 font-bold transition-all",
                            delivery.useCustomPrice
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-muted-foreground hover:bg-secondary/50"
                          )}
                        >
                          Outro
                        </button>
                      </div>
                      {delivery.useCustomPrice && (
                        <div className="mt-3">
                          <Input
                            type="number"
                            placeholder="Digite o valor"
                            value={delivery.customPrice}
                            onChange={(e) => updateDelivery(delivery.id, 'customPrice', e.target.value)}
                            className="text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
                        Observações <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Textarea
                        placeholder="Observações sobre esta entrega..."
                        value={delivery.notes}
                        onChange={(e) => updateDelivery(delivery.id, 'notes', e.target.value)}
                        rows={2}
                        maxLength={120}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          {/* Add delivery button */}
          <button
            type="button"
            onClick={addDelivery}
            className="w-full py-4 px-6 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-all font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar Entrega ao Pedido
          </button>

          {/* Summary */}
          <div className="card-static p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total do Pedido</p>
                <p className="text-3xl font-bold text-foreground">R$ {totalValue.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {deliveries.length} entrega{deliveries.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="w-full text-lg font-bold"
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending || !isValid || !hasCredits}
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Criando...
                </>
              ) : (
                'CONCLUIR PEDIDO'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default NovoPedido;
