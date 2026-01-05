import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RealtimeNotificationOptions {
  showToasts?: boolean;
  soundEnabled?: boolean;
}

export const useRealtimeUpdates = (options: RealtimeNotificationOptions = {}): void => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToasts = true, soundEnabled = false } = options;

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      // Create a simple beep sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
      } catch (e) {
        console.log('Audio not available');
      }
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to notifications for the current user
    const notificationsChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          
          if (showToasts) {
            const notification = payload.new as any;
            toast.info(notification.title, {
              description: notification.message,
            });
          }
          
          playNotificationSound();
        }
      )
      .subscribe();

    // Subscribe to order updates (filtered)
    const ordersChannel = supabase.channel('orders-updates');

    // Companies: only their orders
    if (user.role === 'company') {
      ordersChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Order update (company):', payload);
          queryClient.invalidateQueries({ queryKey: ['orders', 'company', user.id] });
          queryClient.invalidateQueries({ queryKey: ['order'] });

          const order = payload.new as any;
          if (order?.id) {
            queryClient.invalidateQueries({ queryKey: ['order', order.id] });
          }
          const oldOrder = payload.old as any;

          if (payload.eventType === 'UPDATE' && showToasts) {
            if (oldOrder?.status === 'pending' && order.status === 'accepted') {
              toast.success('Pedido aceito!', { description: 'Um entregador aceitou seu pedido.' });
              playNotificationSound();
            }
            if (oldOrder?.status === 'accepted' && order.status === 'driver_completed') {
              toast.success('Entrega realizada!', { description: 'O entregador finalizou a entrega. Confirme o recebimento.' });
              playNotificationSound();
            }
          }
        }
      );
    }

    // Drivers: their assigned orders
    if (user.role === 'driver') {
      ordersChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `driver_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Order update (driver):', payload);
          queryClient.invalidateQueries({ queryKey: ['orders', 'driver', user.id] });
          queryClient.invalidateQueries({ queryKey: ['order'] });

          const order = payload.new as any;
          if (order?.id) {
            queryClient.invalidateQueries({ queryKey: ['order', order.id] });
          }
          const oldOrder = payload.old as any;
          if (payload.eventType === 'UPDATE' && showToasts) {
            if (oldOrder?.status === 'driver_completed' && order.status === 'completed') {
              toast.success('Pedido concluído!', { description: 'A empresa confirmou a entrega.' });
              playNotificationSound();
            }
          }
        }
      );

      // Drivers: new pending orders (for available list)
      ordersChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `status=eq.pending`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', 'available'] });
          if (showToasts) {
            toast.info('Novo pedido disponível!', { description: 'Confira os pedidos disponíveis.' });
            playNotificationSound();
          }
        }
      );

      // When a pending order becomes accepted/completed elsewhere, refresh available list too
      ordersChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `status=eq.accepted`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', 'available'] });
        }
      );
    }

    ordersChannel.subscribe();

    // Subscribe to credits updates
    const creditsChannel = supabase
      .channel('credits-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Credits update:', payload);
          queryClient.invalidateQueries({ queryKey: ['credits', user.id] });
          
          if (payload.eventType === 'INSERT' && showToasts) {
            toast.success('Créditos adicionados!', {
              description: 'Seus créditos foram atualizados.',
            });
            playNotificationSound();
          }
        }
      )
      .subscribe();

    // Subscribe to admin alerts
    const alertsChannel = supabase
      .channel('alerts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_alerts',
          filter: `target_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Alert update:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-alerts', user.id] });
          
          if (payload.eventType === 'INSERT' && showToasts) {
            const alert = payload.new as any;
            if (alert.active) {
              toast.warning('Aviso importante', {
                description: alert.message,
                duration: 10000,
              });
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [user, queryClient, showToasts, playNotificationSound]);

  return null;
};
