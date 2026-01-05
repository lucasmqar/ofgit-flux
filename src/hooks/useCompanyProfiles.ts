import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type CompanyProfile = Tables<'company_profiles'>;

export const useCompanyProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['company_profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useCreateCompanyProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: TablesInsert<'company_profiles'>) => {
      const { data, error } = await supabase
        .from('company_profiles')
        .insert(profile)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company_profile', data.user_id] });
    },
  });
};

export const useUpdateCompanyProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: TablesUpdate<'company_profiles'> }) => {
      const { data, error } = await supabase
        .from('company_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company_profile', data.user_id] });
    },
  });
};
