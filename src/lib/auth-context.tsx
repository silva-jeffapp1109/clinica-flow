import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  const mountedRef = useRef(true);

  const loadProfile = async (uid: string) => {
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      ]);
      if (mountedRef.current) {
        setProfile((p as Profile) ?? null);
        setRole((r?.role as Role) ?? null);
      }
    } catch (err) {
      console.warn("[AuthProvider] Erro ao carregar perfil:", err);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // Ouve mudanças de auth — registra antes de getSession para evitar race condition
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!mountedRef.current) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await loadProfile(s.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    // Obtém sessão inicial e aguarda o perfil antes de tirar o loading
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mountedRef.current) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (mountedRef.current) setLoading(false);
    }).catch((err) => {
      console.error("[AuthProvider] Erro ao obter sessão:", err);
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthCtx = {
    loading, user, session, profile, role,
    isAdmin: role === "admin",
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setRole(null);
      setUser(null);
      setSession(null);
    },
    refresh: async () => { if (user) await loadProfile(user.id); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}