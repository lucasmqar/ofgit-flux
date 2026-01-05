import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a rating already exists for a given order from a specific user
 */
export const useOrderRating = (orderId?: string, fromUserId?: string) => {
  return useQuery({
    queryKey: ['rating', 'order', orderId, fromUserId],
    queryFn: async () => {
      if (!orderId || !fromUserId) return null;
      
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('order_id', orderId)
        .eq('from_user_id', fromUserId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!fromUserId,
  });
};
