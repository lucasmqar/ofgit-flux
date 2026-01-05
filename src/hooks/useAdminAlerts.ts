import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type AdminAlert = Tables<'admin_alerts'>;

export const useAdminAlerts = () => {
  return useQuery({
    queryKey: ['adminAlerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useUserAlerts = (userId?: string) => {
  return useQuery({
    queryKey: ['adminAlerts', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('target_user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useCreateAdminAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alert: Omit<TablesInsert<'admin_alerts'>, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('admin_alerts')
        .insert(alert)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAlerts'] });
    },
  });
};

export const useUpdateAdminAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('admin_alerts')
        .update({ active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAlerts'] });
    },
  });
};

export const useDeleteAdminAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('admin_alerts')
        .delete()
        .eq('id', alertId);
      
      if (error) throw error;
      return alertId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAlerts'] });
    },
  });
};
