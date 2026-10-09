"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database, Tables } from "@/types/database.types";

export type Profile = Tables<"profiles">;

interface SessionValue {
  user: User | null;
  profile: Profile | null;
  /** true mientras se resuelve la sesión inicial. */
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

async function fetchProfile(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;

    // INITIAL_SESSION llega en cuanto nos suscribimos.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nuevo = session?.user ?? null;
      setUser(nuevo);

      if (!nuevo) {
        setProfile(null);
        setLoading(false);
      } else if (event !== "TOKEN_REFRESHED") {
        // Fuera del callback: supabase-js recomienda no esperar otras llamadas dentro de él.
        setTimeout(async () => {
          const perfil = await fetchProfile(supabase, nuevo.id);
          if (activo) {
            setProfile(perfil);
            setLoading(false);
          }
        }, 0);
      }
    });

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) setProfile(await fetchProfile(supabase, user.id));
  }, [supabase, user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile, signOut }),
    [user, profile, loading, refreshProfile, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
