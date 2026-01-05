import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrders } from '@/hooks/useOrders';
import { StatusBadge } from '@/components/StatusBadge';
import { DeliveryCodeDisplay } from '@/components/DeliveryCodeDisplay';
import { PACKAGE_TYPE_LABELS, formatBrasiliaDateShort } from '@/types';
import { formatOrderCode } from '@/lib/utils';
import { 
  KeyRound, 
  Search, 
  Package, 
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CodigosEntrega = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openOrders, setOpenOrders] = useState<string[]>([]);

  const { data: orders, isLoading } = useOrders(user?.id);

  if (!user || user.role !== 'company') return null;

  // Filter orders that have delivery codes (status !== pending) - include in-progress orders (accepted, driver_completed)
  const ordersWithCodes = orders?.filter(
    order => order.status === 'accepted' || order.status === 'driver_completed' || order.status === 'completed'
  ) || [];

  // Search filter
  const filteredOrders = ordersWithCodes.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const hasMatchingDelivery = order.order_deliveries?.some(
      (d: any) => 
        d.customer_name?.toLowerCase().includes(searchLower) ||
        d.customer_phone?.includes(searchTerm) ||
        d.delivery_code?.toLowerCase().includes(searchLower)
    );
    return order.id.toLowerCase().includes(searchLower) || hasMatchingDelivery;
  });

  const toggleOrder = (orderId: string) => {
    setOpenOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Códigos de Entrega</h1>
            <p className="text-muted-foreground">Visualize os códigos de validação dos seus pedidos</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, telefone ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 card-static">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum pedido encontrado' : 'Nenhum pedido com códigos ainda'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Os códigos são gerados quando um entregador aceita o pedido
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <Collapsible
                key={order.id}
                open={openOrders.includes(order.id)}
                onOpenChange={() => toggleOrder(order.id)}
              >
                <div className="card-static overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">
                            Pedido {formatOrderCode(order.id)}
                          </p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatBrasiliaDateShort(new Date(order.created_at))} • 
                          {order.order_deliveries?.length || 0} entrega(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        R$ {order.total_value.toFixed(2)}
                      </span>
                      {openOrders.includes(order.id) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {order.order_deliveries?.map((delivery: any, index: number) => (
                        <div key={delivery.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {PACKAGE_TYPE_LABELS[delivery.package_type as keyof typeof PACKAGE_TYPE_LABELS]}
                            </span>
                            {delivery.customer_name && (
                              <span className="text-sm text-muted-foreground">
                                • {delivery.customer_name}
                              </span>
                            )}
                          </div>

                          {delivery.delivery_code ? (
                            <DeliveryCodeDisplay
                              code={delivery.delivery_code}
                              deliveryIndex={index}
                              orderId={order.id}
                              customerPhone={delivery.customer_phone}
                              customerName={delivery.customer_name}
                              isValidated={!!delivery.validated_at}
                              codeSentAt={delivery.code_sent_at}
                              alwaysVisible={true}
                            />
                          ) : (
                            <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
                              Código não gerado ainda
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/pedido/${order.id}`)}
                      >
                        Ver detalhes do pedido
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CodigosEntrega;
