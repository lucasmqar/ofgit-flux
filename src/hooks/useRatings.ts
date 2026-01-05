import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Rating = Tables<'ratings'>;

export const useRatings = (toUserId?: string) => {
  return useQuery({
    queryKey: ['ratings', toUserId],
    queryFn: async () => {
      if (!toUserId) return [];
      
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('to_user_id', toUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!toUserId,
  });
};

export const useAverageRating = (toUserId?: string) => {
  return useQuery({
    queryKey: ['ratings', 'average', toUserId],
    queryFn: async () => {
      if (!toUserId) return null;
      
      const { data, error } = await supabase
        .from('ratings')
        .select('stars')
        .eq('to_user_id', toUserId);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const sum = data.reduce((acc, r) => acc + r.stars, 0);
      return sum / data.length;
    },
    enabled: !!toUserId,
  });
};

export const useCreateRating = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rating: Omit<TablesInsert<'ratings'>, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ratings')
        .insert(rating)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', data.to_user_id] });
    },
  });
};
