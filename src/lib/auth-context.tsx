import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "admin" | "staff";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  owner_id: string;
  specialty: string | null;
}

interface AuthCtx {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
    setProfile((p as Profile) ?? null);
    setRole((r?.role as Role) ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { loadProfile(s.user.id); }, 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    loading, user, session, profile, role,
    isAdmin: role === "admin",
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    },
    signOut: async () => { await supabase.auth.signOut(); },
    refresh: async () => { if (user) await loadProfile(user.id); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}