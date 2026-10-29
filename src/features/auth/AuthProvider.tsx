import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext } from "./authContext";
import type { SignUpInput } from "./authContext";
import { supabase, supabaseConfiguration } from "../../lib/supabase/client";
import { ROUTES } from "../../app/routePaths";

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

  const signUpWithPassword = useCallback(async ({
    email,
    password,
    displayName,
    requestedStoreName,
  }: SignUpInput) => {
    if (!supabase) {
      throw new Error(configurationError ?? "Supabase is not configured.");
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: new URL(ROUTES.ownerSetup, window.location.origin).toString(),
        data: {
          display_name: displayName.trim(),
          requested_store_name: requestedStoreName.trim(),
        },
      },
    });
    if (signUpError) throw signUpError;
    if (!data.user) {
      throw new Error("Supabase did not return the new Auth user.");
    }

    if (data.session) {
      setSession(data.session);
      setError(null);
      setIsLoading(false);
    }

    return {
      userId: data.user.id,
      sessionAvailable: data.session !== null,
    };
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
    () => ({ session, isLoading, error, configurationError, signInWithPassword, signUpWithPassword, signOut }),
    [session, isLoading, error, signInWithPassword, signUpWithPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}