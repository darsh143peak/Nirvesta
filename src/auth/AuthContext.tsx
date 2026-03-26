import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { hasSupabaseEnv, supabase } from "../lib/supabase";

export type UserProfile = {
  id: string;
  full_name: string | null;
  age: number | null;
  email: string | null;
  risk_attitude: string | null;
  investing_experience: string | null;
  primary_goal: string | null;
  time_horizon_years: number | null;
  monthly_investable_surplus: number | null;
  emergency_fund_months: number | null;
  email_notifications: boolean | null;
};

type SignUpPayload = {
  fullName: string;
  age: number;
  email: string;
  password: string;
  riskAttitude: string;
  investingExperience: string;
  primaryGoal: string;
  timeHorizonYears: number;
  monthlyInvestableSurplus: number;
  emergencyFundMonths: number;
  emailNotifications: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasSupabaseEnv: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (payload: SignUpPayload) => Promise<{ error: string | null; needsEmailVerification: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile(userId?: string) {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }

    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<UserProfile>();
    setProfile(data ?? null);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      await refreshProfile(data.session?.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void refreshProfile(nextSession?.user.id);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      isAuthenticated: Boolean(session?.access_token),
      hasSupabaseEnv,
      async signIn(email, password) {
        if (!supabase) {
          return { error: "Supabase environment variables are missing." };
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUp(payload) {
        if (!supabase) {
          return { error: "Supabase environment variables are missing.", needsEmailVerification: false };
        }

        const { data, error } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            emailRedirectTo: `${window.location.origin}/connect`,
            data: {
              full_name: payload.fullName,
              age: payload.age,
              risk_attitude: payload.riskAttitude,
              investing_experience: payload.investingExperience,
              primary_goal: payload.primaryGoal,
              time_horizon_years: payload.timeHorizonYears,
              monthly_investable_surplus: payload.monthlyInvestableSurplus,
              emergency_fund_months: payload.emergencyFundMonths,
              email_notifications: payload.emailNotifications,
            },
          },
        });

        const needsEmailVerification = !data.session;
        return { error: error?.message ?? null, needsEmailVerification };
      },
      async signInWithGoogle() {
        if (!supabase) {
          return { error: "Supabase environment variables are missing." };
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/connect`,
          },
        });

        return { error: error?.message ?? null };
      },
      async signOut() {
        if (!supabase) {
          return;
        }

        await supabase.auth.signOut();
        setProfile(null);
      },
      async updateProfile(updates) {
        if (!supabase || !user) {
          return { error: "You need an active session to update your profile." };
        }

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);

        if (!error) {
          await refreshProfile(user.id);
        }

        return { error: error?.message ?? null };
      },
      refreshProfile,
    }),
    [session, user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
