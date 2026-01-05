import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { pushNotificationService } from '@/services/pushNotifications';

export type AppRole = 'admin' | 'company' | 'driver';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole | null;
  createdAt: Date;
}

interface Credits {
  userId: string;
  validUntil: Date;
}

interface AuthContextType {
  user: UserProfile | null;
  credits: Credits | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCredits: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, phone?: string, role?: AppRole) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile and role
  const fetchUserData = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      // Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Error fetching credits:', creditsError);
      }

      if (creditsData) {
        setCredits({
          userId: creditsData.user_id,
          validUntil: new Date(creditsData.valid_until),
        });
      } else {
        setCredits(null);
      }

      if (profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          role: roleData?.role as AppRole | null,
          createdAt: new Date(profile.created_at),
        };
      }

      return null;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Request push permission as soon as the app opens (native only), even before login.
    // This ensures the fresh-install UX prompts BEFORE authentication flows.
    pushNotificationService.initializeAnonymous().catch((error) => {
      console.error('[FLUX Push] Failed to initialize anonymously:', error);
    });

    // Handle OAuth redirect back into the native app via deep link (Google)
    // This is required for the APK flow where the external browser redirects to space.iflux.app://callback
    let appUrlOpenHandle: PluginListenerHandle | null = null;
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          appUrlOpenHandle = await CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
            try {
              if (!url) return;
              if (!url.startsWith('space.iflux.app://callback')) return;

              const hashIndex = url.indexOf('#');
              const queryIndex = url.indexOf('?');
              const rawParams = hashIndex >= 0
                ? url.slice(hashIndex + 1)
                : queryIndex >= 0
                  ? url.slice(queryIndex + 1)
                  : '';

              const params = new URLSearchParams(rawParams);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              const authCode = params.get('code');

              if (accessToken && refreshToken) {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                return;
              }

              if (authCode) {
                await supabase.auth.exchangeCodeForSession(authCode);
              }
            } catch (error) {
              console.error('OAuth deep link handling failed:', error);
            }
          });
        } catch (error) {
          console.error('Failed to register appUrlOpen listener:', error);
        }
      })();
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout
          setTimeout(async () => {
            const userData = await fetchUserData(session.user);
            setUser(userData);
            setIsLoading(false);
            
            // Initialize push notifications after login
            if (userData?.id) {
              await pushNotificationService.initialize(userData.id);
            }
          }, 0);
        } else {
          setUser(null);
          setCredits(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user).then(async (userData) => {
          setUser(userData);
          setIsLoading(false);
          
          // Initialize push notifications on app start
          if (userData?.id) {
            await pushNotificationService.initialize(userData.id);
          }
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      appUrlOpenHandle?.remove();
    };
  }, [fetchUserData]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email ou senha incorretos' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login' };
    }
  }, []);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    phone?: string,
    role?: AppRole
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const isNative = Capacitor.isNativePlatform();

      const redirectUrl = isNative
        ? 'space.iflux.app://callback'
        : `${window.location.origin}/completar-perfil`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            phone,
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { success: false, error: 'Este email já está cadastrado' };
        }
        return { success: false, error: error.message };
      }

      // User must select role manually in CompletarPerfil page

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao criar conta' };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const isNative = Capacitor.isNativePlatform();

      // Web: return to /auth so Auth.tsx can route to /dashboard or /completar-perfil.
      // Native: return to the configured deep link captured by AndroidManifest.
      const redirectUrl = isNative
        ? 'space.iflux.app://callback'
        : `${window.location.origin}/auth`;
      
      console.log('OAuth redirect URL:', redirectUrl, 'isNative:', isNative);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login com Google' };
    }
  }, []);

  const signOut = useCallback(async () => {
    // Remove push notification token before logout
    if (user?.id) {
      await pushNotificationService.removeToken(user.id);
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setCredits(null);
    setSession(null);
  }, [user]);

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Admin has unlimited access - no credits required
  const isAdmin = user?.role === 'admin';
  const hasCreditsActive = isAdmin || (credits ? new Date(credits.validUntil) > new Date() : false);

  return (
    <AuthContext.Provider
      value={{
        user,
        credits,
        isAuthenticated: !!session && !!user,
        isLoading,
        hasCredits: hasCreditsActive,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
