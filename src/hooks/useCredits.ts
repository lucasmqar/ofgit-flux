import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Credits = Tables<'credits'>;

export const useCredits = (userId?: string) => {
  return useQuery({
    queryKey: ['credits', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const hasValidCredits = (credits: Credits | null): boolean => {
  if (!credits) return false;
  return new Date(credits.valid_until) > new Date();
};
