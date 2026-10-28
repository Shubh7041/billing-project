import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext } from "./authContext";
import { supabase, supabaseConfiguration } from "../../lib/supabase/client";

interface AuthProviderProps {
  children: ReactNode;
}

const configurationError = supabaseConfiguration.configured
  ? null
  : supabaseConfiguration.error;

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(supabase !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    let authEventVersion = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion += 1;
      setSession(nextSession);
      setError(null);
      setIsLoading(false);
    });
    const initialEventVersion = authEventVersion;

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEventVersion !== initialEventVersion) return;
      setError(sessionError?.message ?? null);
      setSession(data.session);
      setIsLoading(false);
    }).catch((sessionError: unknown) => {
      if (!active || authEventVersion !== initialEventVersion) return;
      setError(sessionError instanceof Error ? sessionError.message : "Unable to restore the saved session.");
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error(configurationError ?? "Supabase is not configured.");
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) throw signInError;
    if (!data.session) {
      throw new Error("Authentication did not create an active session.");
    }
    setSession(data.session);
    setError(null);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error(configurationError ?? "Supabase is not configured.");
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, error, configurationError, signInWithPassword, signOut }),
    [session, isLoading, error, signInWithPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}