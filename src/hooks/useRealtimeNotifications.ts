import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeNotifications = (userId?: string, userRole?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const ordersChannel = supabase.channel('orders-realtime');

    // Drivers: only new pending orders for the "available" list
    if (userRole === 'driver') {
      ordersChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `status=eq.pending`,
        },
        () => {
          toast.info('🚚 Novo pedido disponível!', {
            description: 'Um novo pedido está aguardando entregador',
            duration: 5000,
          });
          queryClient.invalidateQueries({ queryKey: ['orders', 'available'] });
        }
      );
    }

    // Company: updates only for their orders
    if (userRole === 'company') {
      ordersChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `company_user_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;

          if (newStatus === 'accepted') {
            toast.success('✅ Pedido aceito!', {
              description: 'Um entregador aceitou seu pedido',
              duration: 5000,
            });
          }

          if (newStatus === 'driver_completed') {
            toast.success('📦 Entrega finalizada!', {
              description: 'O entregador finalizou a entrega. Confirme o recebimento.',
              duration: 5000,
            });
          }

          queryClient.invalidateQueries({ queryKey: ['orders', 'company', userId] });
          queryClient.invalidateQueries({ queryKey: ['order'] });
        }
      );
    }

    // Driver: updates only for their assigned orders
    if (userRole === 'driver') {
      ordersChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `driver_user_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;

          if (newStatus === 'completed') {
            toast.success('🎉 Entrega confirmada!', {
              description: 'A empresa confirmou o recebimento',
              duration: 5000,
            });
          }

          queryClient.invalidateQueries({ queryKey: ['orders', 'driver', userId] });
          queryClient.invalidateQueries({ queryKey: ['order'] });
        }
      );
    }

    ordersChannel.subscribe();

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new;
          toast.info(notification.title, {
            description: notification.message,
            duration: 5000,
          });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [userId, userRole, queryClient]);
};
