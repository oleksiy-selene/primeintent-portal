import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { writeTzToUrl } from "@/lib/dateRange";

export interface Profile {
  user_id: string;
  email: string;
  display_name: string | null;
  role: "admin" | "manager" | "viewer";
  timezone: string;
  created_at: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** True once the profile fetch has settled (success or failure). Gates all tz-dependent queries. */
  isProfileLoaded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTimezone: (tz: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const loadProfile = async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      setIsProfileLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, role, timezone, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("Failed to load profile", error);
      setProfile(null);
      setIsProfileLoaded(true);
      return;
    }
    const raw = data as (Profile & { timezone?: string | null }) | null;
    const resolved = raw ? { ...raw, timezone: raw.timezone ?? "America/New_York" } : null;
    setProfile(resolved);
    if (resolved?.timezone) writeTzToUrl(resolved.timezone);
    setIsProfileLoaded(true);
  };

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      // Kick off the profile fetch but never block initial render on it.
      void loadProfile(data.session?.user.id ?? null);
      setLoading(false);
    });

    // IMPORTANT: this callback is intentionally NOT async. supabase-js
    // (`_notifyAllSubscribers`) awaits every onAuthStateChange callback before
    // resolving sign-in/sign-up promises. If this awaited `loadProfile` and the
    // profile query stalled (e.g. RLS misconfiguration, network hiccup),
    // `signInWithPassword` itself would never resolve and the login button
    // spinner would hang forever. Fire-and-forget keeps auth responsive.
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setIsProfileLoaded(false);
        void loadProfile(newSession?.user.id ?? null);
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isProfileLoaded,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        await loadProfile(session?.user.id ?? null);
      },
      setTimezone: async (tz: string) => {
        const userId = session?.user.id;
        if (!userId) return;
        const { error } = await supabase
          .from("profiles")
          .update({ timezone: tz })
          .eq("user_id", userId);
        if (error) throw error;
        setProfile((prev) => (prev ? { ...prev, timezone: tz } : prev));
        writeTzToUrl(tz);
      },
    }),
    [session, profile, loading, isProfileLoaded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
