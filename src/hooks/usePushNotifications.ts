import { supabase } from '@/integrations/supabase/client';

interface SendPushNotificationParams {
  user_ids?: string[];
  role?: 'driver' | 'company';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const usePushNotifications = () => {
  const sendPushNotification = async (params: SendPushNotificationParams) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        const error = new Error('No active session');
        console.error('Error sending push notification:', error);
        return { success: false, error };
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error };
      }

      console.log('Push notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Exception sending push notification:', error);
      return { success: false, error };
    }
  };

  const notifyNewOrderAvailable = async (orderId: string, orderDetails: string) => {
    return sendPushNotification({
      role: 'driver',
      title: '🚀 Novo Pedido Disponível!',
      body: orderDetails,
      data: {
        type: 'new_order',
        order_id: orderId,
        action: 'open_available_orders'
      }
    });
  };

  const notifyOrderAccepted = async (companyUserId: string, driverName: string, orderId: string) => {
    return sendPushNotification({
      user_ids: [companyUserId],
      title: '✅ Pedido Aceito!',
      body: `${driverName} aceitou seu pedido`,
      data: {
        type: 'order_accepted',
        order_id: orderId,
        action: 'open_order_details'
      }
    });
  };

  const notifyOrderCompleted = async (companyUserId: string, driverName: string, orderId: string) => {
    return sendPushNotification({
      user_ids: [companyUserId],
      title: '🎉 Pedido Concluído!',
      body: `${driverName} finalizou a entrega`,
      data: {
        type: 'order_completed',
        order_id: orderId,
        action: 'open_order_details'
      }
    });
  };

  const notifyOrderCollected = async (companyUserId: string, driverName: string, orderId: string) => {
    return sendPushNotification({
      user_ids: [companyUserId],
      title: '📦 Pedido Coletado!',
      body: `${driverName} coletou seu pedido e está a caminho`,
      data: {
        type: 'order_collected',
        order_id: orderId,
        action: 'open_order_details'
      }
    });
  };

  const notifyPaymentMarked = async (driverUserId: string, companyName: string, value: number) => {
    return sendPushNotification({
      user_ids: [driverUserId],
      title: '💰 Pagamento Confirmado!',
      body: `${companyName} confirmou o pagamento de R$ ${value.toFixed(2)}`,
      data: {
        type: 'payment_marked',
        action: 'open_reports'
      }
    });
  };

  return {
    sendPushNotification,
    notifyNewOrderAvailable,
    notifyOrderAccepted,
    notifyOrderCompleted,
    notifyOrderCollected,
    notifyPaymentMarked
  };
};
