import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Generate a random 6-character alphanumeric code (client-side for display)
export const generateDeliveryCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Hash a code using SHA-256 (browser crypto API)
export const hashDeliveryCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Hook to validate a delivery code (for drivers)
export const useValidateDeliveryCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      deliveryId, 
      code, 
      driverUserId 
    }: { 
      deliveryId: string; 
      code: string; 
      driverUserId: string;
    }) => {
      // Server-side validation (atomic + enforced by DB rules)
      const { data, error } = await supabase.rpc('validate_delivery_code', {
        p_delivery_id: deliveryId,
        p_code: code,
        p_driver_user_id: driverUserId,
      });

      if (error) {
        // Keep messages user-friendly
        const msg = (error as any)?.message || 'Erro ao validar código';
        if (msg.toLowerCase().includes('maximum validation attempts')) {
          throw new Error('Limite de tentativas excedido');
        }
        if (msg.toLowerCase().includes('already validated')) {
          throw new Error('Entrega já foi validada');
        }
        if (msg.toLowerCase().includes('not assigned')) {
          throw new Error('Você não é o entregador deste pedido');
        }
        if (msg.toLowerCase().includes('no code set')) {
          throw new Error('Código não configurado para esta entrega');
        }
        throw new Error(msg);
      }

      if (data === true) {
        return { success: true, message: 'Código validado com sucesso!' };
      }

      throw new Error('Código inválido.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
};

// Hook to set delivery code hash (for order creation)
export const useSetDeliveryCodeHash = () => {
  return useMutation({
    mutationFn: async ({ 
      deliveryId, 
      codeHash 
    }: { 
      deliveryId: string; 
      codeHash: string;
    }) => {
      const { error } = await supabase
        .from('order_deliveries')
        .update({ code_hash: codeHash })
        .eq('id', deliveryId);
      
      if (error) throw error;
    },
  });
};

// Store codes temporarily in memory during order creation
// These will be shown to the company and sent to customers
export interface DeliveryCodeMap {
  [deliveryId: string]: string; // plain text code
}
