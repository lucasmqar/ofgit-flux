import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

export type Order = Tables<'orders'>;
export type OrderDelivery = Tables<'order_deliveries'>;
export type OrderStatus = Enums<'order_status'>;
export type PackageType = Enums<'package_type'>;

export interface OrderWithDeliveries extends Order {
  order_deliveries: OrderDelivery[];
}

export const useOrders = (companyUserId?: string) => {
  return useQuery({
    queryKey: ['orders', 'company', companyUserId],
    queryFn: async () => {
      if (!companyUserId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .eq('company_user_id', companyUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderWithDeliveries[];
    },
    enabled: !!companyUserId,
  });
};

export const useDriverOrders = (driverUserId?: string) => {
  return useQuery({
    queryKey: ['orders', 'driver', driverUserId],
    queryFn: async () => {
      if (!driverUserId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .eq('driver_user_id', driverUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderWithDeliveries[];
    },
    enabled: !!driverUserId,
  });
};

export const useAvailableOrders = (city?: string | null) => {
  return useQuery({
    queryKey: ['orders', 'available', city || null],
    queryFn: async () => {
      if (!city || !city.trim()) return [];

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .eq('status', 'pending');

      if (city && city.trim()) {
        query = query.eq('city', city);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderWithDeliveries[];
    },
    enabled: !!city && !!city.trim(),
  });
};

export const useOrder = (orderId?: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .eq('id', orderId)
        .maybeSingle();
      
      if (error) throw error;
      return data as OrderWithDeliveries | null;
    },
    enabled: !!orderId,
  });
};

// Validation constants matching database constraints
const MAX_ADDRESS_LENGTH = 500;
const MIN_ADDRESS_LENGTH = 5;
const MAX_NOTES_LENGTH = 500;
const MIN_PRICE = 0;
const MAX_PRICE = 10000;
const MAX_TOTAL_VALUE = 100000;

const validateDelivery = (delivery: Omit<TablesInsert<'order_deliveries'>, 'id' | 'order_id' | 'created_at'>) => {
  if (!delivery.pickup_address || delivery.pickup_address.length < MIN_ADDRESS_LENGTH) {
    throw new Error('Endereço de retirada muito curto (mínimo 5 caracteres)');
  }
  if (delivery.pickup_address.length > MAX_ADDRESS_LENGTH) {
    throw new Error('Endereço de retirada muito longo (máximo 500 caracteres)');
  }
  if (!delivery.dropoff_address || delivery.dropoff_address.length < MIN_ADDRESS_LENGTH) {
    throw new Error('Endereço de entrega muito curto (mínimo 5 caracteres)');
  }
  if (delivery.dropoff_address.length > MAX_ADDRESS_LENGTH) {
    throw new Error('Endereço de entrega muito longo (máximo 500 caracteres)');
  }
  if (delivery.notes && delivery.notes.length > MAX_NOTES_LENGTH) {
    throw new Error('Observações muito longas (máximo 500 caracteres)');
  }
  if (delivery.suggested_price < MIN_PRICE || delivery.suggested_price > MAX_PRICE) {
    throw new Error(`Preço inválido (deve ser entre R$${MIN_PRICE} e R$${MAX_PRICE})`);
  }
};

// Result type for order creation
export interface CreateOrderResult {
  order: Order;
}

const trySendPush = async (params: {
  user_ids?: string[];
  role?: 'driver' | 'company';
  platform?: 'android' | 'ios' | 'web';
  city?: string | null;
  state?: string | null;
  title: string;
  body: string;
  data?: Record<string, any>;
}) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      console.warn('[Push] Skipping send (no auth session)');
      return;
    }

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (error) {
      console.warn('[Push] Failed to send:', error);
    }
  } catch (e) {
    console.warn('[Push] Exception sending push:', e);
  }
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      order, 
      deliveries 
    }: { 
      order: Omit<TablesInsert<'orders'>, 'id' | 'created_at' | 'updated_at'>; 
      deliveries: (Omit<TablesInsert<'order_deliveries'>, 'id' | 'order_id' | 'created_at' | 'code_hash' | 'validation_attempts'> & {
        customer_name?: string;
        customer_phone?: string;
      })[];
    }): Promise<CreateOrderResult> => {
      // Validate all deliveries before inserting
      deliveries.forEach(validateDelivery);
      
      // Validate total value
      if (order.total_value < MIN_PRICE || order.total_value > MAX_TOTAL_VALUE) {
        throw new Error(`Valor total inválido (deve ser entre R$${MIN_PRICE} e R$${MAX_TOTAL_VALUE})`);
      }
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create deliveries (codes will be generated when driver accepts)
      const deliveriesWithOrderId = deliveries.map(d => ({
        ...d,
        order_id: orderData.id,
        validation_attempts: 0,
      }));
      
      const { error: deliveriesError } = await supabase
        .from('order_deliveries')
        .insert(deliveriesWithOrderId);
      
      if (deliveriesError) throw deliveriesError;

      // Notify drivers that a new order is available
      // (Edge Function will resolve driver users by role)
      await trySendPush({
        role: 'driver',
        platform: 'android',
        city: orderData.city,
        state: orderData.state,
        title: 'Novo pedido disponível',
        body: `${deliveries.length} entrega(s) • R$ ${Number(order.total_value).toFixed(2)}`,
        data: {
          type: 'new_order',
          order_id: orderData.id,
          action: 'open_available_orders',
        },
      });
      
      return { order: orderData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      orderId, 
      status, 
      driverUserId 
    }: { 
      orderId: string; 
      status: OrderStatus; 
      driverUserId?: string;
    }) => {
      const updates: Partial<Order> = { status };
      
      if (status === 'accepted' && driverUserId) {
        // Rule: drivers can only have one active order at a time.
        // Do the check here so every accept flow (details/list/etc.) is covered.
        const { data: activeOrders, error: activeError } = await supabase
          .from('orders')
          .select('id')
          .eq('driver_user_id', driverUserId)
          .in('status', ['accepted'])
          .limit(1);

        if (activeError) throw activeError;
        if (activeOrders && activeOrders.length > 0) {
          throw new Error('Finalize sua entrega atual antes de aceitar outro pedido');
        }

        updates.driver_user_id = driverUserId;
        updates.accepted_at = new Date().toISOString();
      } else if (status === 'driver_completed') {
        updates.driver_completed_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
      }

      const updateQuery = supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      // Make accept atomic: only accept orders still available.
      // Prevents two drivers (or two tabs) from accepting the same order.
      const guardedUpdateQuery = status === 'accepted'
        ? updateQuery.eq('status', 'pending').is('driver_user_id', null)
        : updateQuery;

      const { data, error } = await guardedUpdateQuery
        .select()
        .maybeSingle();
      
      if (error) throw error;

      if (!data) {
        throw new Error(status === 'accepted'
          ? 'Este pedido não está mais disponível para aceite'
          : 'Não foi possível atualizar o pedido');
      }

      // Send delivery codes via Twilio when order is accepted
      if (status === 'accepted' && driverUserId) {
        try {
          console.log('Sending delivery codes via edge function...');
          const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-delivery-codes', {
            body: { orderId, driverUserId }
          });
          
          if (sendError) {
            console.error('Error sending delivery codes:', sendError);
          } else {
            console.log('Delivery codes sent:', sendResult);
          }
        } catch (e) {
          console.error('Failed to call send-delivery-codes function:', e);
        }
      }

      // Push notifications for order movements (best-effort)
      try {
        if (status === 'accepted') {
          await trySendPush({
            user_ids: [data.company_user_id],
            platform: 'android',
            title: 'Pedido aceito',
            body: 'Um entregador aceitou seu pedido',
            data: { type: 'order_accepted', order_id: data.id, action: 'open_order_details' },
          });
        } else if (status === 'driver_completed') {
          await trySendPush({
            user_ids: [data.company_user_id],
            platform: 'android',
            title: 'Entrega finalizada',
            body: 'O entregador marcou o pedido como finalizado',
            data: { type: 'order_driver_completed', order_id: data.id, action: 'open_order_details' },
          });
        } else if (status === 'completed' && data.driver_user_id) {
          await trySendPush({
            user_ids: [data.driver_user_id],
            platform: 'android',
            title: 'Pedido concluído',
            body: 'A empresa concluiu o pedido',
            data: { type: 'order_completed', order_id: data.id, action: 'open_order_details' },
          });
        } else if (status === 'cancelled') {
          const targets: string[] = [data.company_user_id];
          if (data.driver_user_id) targets.push(data.driver_user_id);
          await trySendPush({
            user_ids: targets,
            platform: 'android',
            title: 'Pedido cancelado',
            body: 'Um pedido foi cancelado',
            data: { type: 'order_cancelled', order_id: data.id, action: 'open_order_details' },
          });
        }
      } catch (e) {
        console.warn('[Push] Failed to send order movement push:', e);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.id] });
    },
  });
};
