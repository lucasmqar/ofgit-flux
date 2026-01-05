import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DriverProfile = Tables<'driver_profiles'>;
export type VehicleType = 'moto' | 'car' | 'bike';

export const useDriverProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['driver_profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useCreateDriverProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: TablesInsert<'driver_profiles'>) => {
      const { data, error } = await supabase
        .from('driver_profiles')
        .insert(profile)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver_profile', data.user_id] });
    },
  });
};

export const useUpdateDriverProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: TablesUpdate<'driver_profiles'> }) => {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver_profile', data.user_id] });
    },
  });
};
