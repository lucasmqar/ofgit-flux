import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "company" | "driver";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export type Credits = {
  userId: string;
  validUntil: Date;
};

export type VehicleType = "moto" | "car" | "bike";

export type SignUpPayload = {
  email: string;
  password: string;
  name: string;
  role: Exclude<AppRole, "admin">;
  phone?: string;
  state: string;
  city: string;
  companyName?: string;
  cnpj?: string;
  vehicleType?: VehicleType;
  vehicleModel?: string;
  plate?: string;
};

type AuthContextType = {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: UserProfile | null;
  role: AppRole | null;
  credits: Credits | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasActiveCredits: boolean;

  refresh: () => Promise<void>;

  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (payload: SignUpPayload) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setMyRole: (role: Exclude<AppRole, "admin">) => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }) as Promise<T>;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[institucional] profile fetch failed", error);
    return null;
  }

  if (!data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    email: data.email as string,
    phone: (data.phone as string | null) ?? null,
  } satisfies UserProfile;
}

async function fetchRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[institucional] role fetch failed", error);
    return null;
  }

  return (data?.role as AppRole | undefined) ?? null;
}

async function fetchCredits(userId: string): Promise<Credits | null> {
  const { data, error } = await supabase
    .from("credits")
    .select("user_id, valid_until")
    .eq("user_id", userId)
    .maybeSingle();

  // No row is OK.
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[institucional] credits fetch failed", error);
    return null;
  }

  if (!data) return null;

  return {
    userId: data.user_id as string,
    validUntil: new Date(data.valid_until as string),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = useCallback(async (user: SupabaseUser) => {
    const [p, r, c] = await Promise.all([
      fetchProfile(user.id),
      fetchRole(user.id),
      fetchCredits(user.id),
    ]);

    setProfile(p);
    setRole(r);
    setCredits(c);
  }, []);

  const refresh = useCallback(async () => {
    if (!supabaseUser) return;
    await refreshUserData(supabaseUser);
  }, [refreshUserData, supabaseUser]);

  useEffect(() => {
    let isMounted = true;
    let watchdogId: number | undefined;

    // If Supabase hangs for any reason, never keep the whole app stuck in loading.
    watchdogId = window.setTimeout(() => {
      if (!isMounted) return;
      // eslint-disable-next-line no-console
      console.warn("[institucional] auth init watchdog fired; forcing isLoading=false");
      setIsLoading(false);
    }, 8000);

    const clearWatchdog = () => {
      if (watchdogId !== undefined) {
        window.clearTimeout(watchdogId);
        watchdogId = undefined;
      }
    };

    // Listener FIRST
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setSupabaseUser(nextSession?.user ?? null);

      try {
        if (nextSession?.user) {
          await withTimeout(refreshUserData(nextSession.user), 8000, "auth_user_data_timeout");
        } else {
          setProfile(null);
          setRole(null);
          setCredits(null);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[institucional] onAuthStateChange refreshUserData failed", error);
      } finally {
        clearWatchdog();
        setIsLoading(false);
      }
    });

    // THEN initial session
    withTimeout(supabase.auth.getSession(), 8000, "auth_get_session_timeout")
      .then(async ({ data }) => {
        if (!isMounted) return;

        setSession(data.session);
        setSupabaseUser(data.session?.user ?? null);

        try {
          if (data.session?.user) {
            await withTimeout(refreshUserData(data.session.user), 8000, "auth_user_data_timeout");
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("[institucional] initial refreshUserData failed", error);
        } finally {
          clearWatchdog();
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        // eslint-disable-next-line no-console
        console.warn("[institucional] initial getSession failed", error);
        clearWatchdog();
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (watchdogId !== undefined) window.clearTimeout(watchdogId);
      authListener.subscription.unsubscribe();
    };
  }, [refreshUserData]);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: "Erro ao fazer login" };
    }
  }, []);

  const signUpWithPassword = useCallback(async (payload: SignUpPayload) => {
    const {
      email,
      password,
      name,
      role: chosenRole,
      phone,
      state,
      city,
      companyName,
      cnpj,
      vehicleType,
      vehicleModel,
      plate,
    } = payload;

    const trimmedState = state.trim();
    const trimmedCity = city.trim();

    if (!trimmedState || !trimmedCity) {
      return { success: false, error: "Informe estado e cidade." };
    }

    if (chosenRole === "company" && !companyName?.trim()) {
      return { success: false, error: "Informe o nome da empresa." };
    }

    if (chosenRole === "company" && !cnpj?.trim()) {
      return { success: false, error: "Informe o CNPJ." };
    }

    if (chosenRole === "driver") {
      if (!vehicleType) return { success: false, error: "Selecione o tipo de veículo." };
      if (!vehicleModel?.trim()) return { success: false, error: "Informe o modelo do veículo." };
      if (!plate?.trim()) return { success: false, error: "Informe a placa." };
    }

      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              name,
              phone: phone ?? null,
              role: chosenRole,
            },
          },
        });

        if (error) return { success: false, error: error.message };

        // If email confirmation is enabled, the session may not exist yet.
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;

        if (!userId) {
          return { success: true };
        }

        // Persist role (required for the app to consider the user "complete").
        const roleRes = await supabase.rpc("set_my_role", { p_role: chosenRole });
        if (roleRes.error && !roleRes.error.message?.includes("role_already_set")) {
          return { success: false, error: roleRes.error.message };
        }

        // Persist base profile (required by app).
        const profileRes = await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              name,
              email,
              phone: phone ?? null,
            },
            { onConflict: "id" },
          );

        if (profileRes.error) {
          return { success: false, error: profileRes.error.message };
        }

        // Persist role-specific profile.
        if (chosenRole === "company") {
          const cnpjDigits = cnpj!.trim().replace(/\D/g, "");
          const companyRes = await supabase
            .from("company_profiles")
            .upsert(
              {
                user_id: userId,
                company_name: companyName!.trim(),
                cnpj: cnpjDigits,
                state: trimmedState,
                city: trimmedCity,
              },
              { onConflict: "user_id" },
            );

          if (companyRes.error) {
            return { success: false, error: companyRes.error.message };
          }
        }

        if (chosenRole === "driver") {
          const plateNormalized = plate!
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
          const driverRes = await supabase
            .from("driver_profiles")
            .upsert(
              {
                user_id: userId,
                vehicle_type: vehicleType,
                vehicle_model: vehicleModel!.trim(),
                plate: plateNormalized,
                state: trimmedState,
                city: trimmedCity,
              },
              { onConflict: "user_id" },
            );

          if (driverRes.error) {
            return { success: false, error: driverRes.error.message };
          }
        }

        return { success: true };
      } catch {
        return { success: false, error: "Erro ao criar conta" };
      }
  }, []);

  const setMyRole = useCallback(async (chosenRole: Exclude<AppRole, "admin">) => {
    try {
      const { data, error } = await supabase.rpc("set_my_role", { p_role: chosenRole });
      if (error) {
        if (error.message?.includes("role_already_set")) {
          return { success: false, error: "Sua conta já possui um tipo definido." };
        }
        return { success: false, error: error.message };
      }

      const newRole = (data as AppRole | null) ?? chosenRole;
      setRole(newRole);
      return { success: true };
    } catch {
      return { success: false, error: "Não foi possível definir seu tipo de conta." };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Local sign out prevents being stuck logged-in when network is flaky.
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      // Even if the network/signOut fails, clear local state and redirect.
      // eslint-disable-next-line no-console
      console.warn("[institucional] signOut failed, clearing local state anyway", e);
    }

    try {
      window.sessionStorage.removeItem("pendingCheckoutPlanKey");
    } catch {
      // ignore
    }

    // Clear all auth state
    setSession(null);
    setSupabaseUser(null);
    setProfile(null);
    setRole(null);
    setCredits(null);
    // Redirect to home
    window.location.replace("/");
  }, []);

  const isAuthenticated = !!session?.user;
  const hasActiveCredits = useMemo(() => {
    if (role === "admin") return true;
    if (!credits) return false;
    return credits.validUntil.getTime() > Date.now();
  }, [credits, role]);

  const value: AuthContextType = {
    session,
    supabaseUser,
    profile,
    role,
    credits,
    isLoading,
    isAuthenticated,
    hasActiveCredits,

    refresh,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    setMyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
