import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Enums } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;
export type UserRole = Tables<'user_roles'>;
export type Credit = Tables<'credits'>;
export type AppRole = Enums<'app_role'>;

export interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole | null;
  createdAt: Date;
  credits: {
    validUntil: Date;
  } | null;
  isBanned?: boolean;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch all credits
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('*');

      if (creditsError) throw creditsError;

      // Map profiles with roles and credits
      const usersWithDetails: UserWithDetails[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.id);
        const userCredits = credits.find(c => c.user_id === profile.id);

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          role: userRole?.role as AppRole | null,
          createdAt: new Date(profile.created_at),
          credits: userCredits ? {
            validUntil: new Date(userCredits.valid_until),
          } : null,
          isBanned: false, // TODO: Add banned field to profiles table if needed
        };
      });

      return usersWithDetails;
    },
  });
};

export const useAddCredits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, validUntil }: { userId: string; validUntil: Date }) => {
      const { data, error } = await supabase
        .from('credits')
        .upsert({
          user_id: userId,
          valid_until: validUntil.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: banned ? 'ban' : 'unban',
          userId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Falha ao atualizar usuário');
      return { userId, banned };
    },
    onSuccess: ({ userId, banned }) => {
      queryClient.setQueryData(['users', 'all'], (current: UserWithDetails[] | undefined) => {
        if (!current) return current;
        return current.map((u) => (u.id === userId ? { ...u, isBanned: banned } : u));
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: 'delete',
          userId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Falha ao excluir usuário');
      return userId;
    },
    onSuccess: (deletedUserId) => {
      // Optimistic removal so the card disappears immediately
      queryClient.setQueryData(['users', 'all'], (current: UserWithDetails[] | undefined) => {
        if (!current) return current;
        return current.filter((u) => u.id !== deletedUserId);
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
