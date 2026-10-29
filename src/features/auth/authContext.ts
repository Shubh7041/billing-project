import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  configurationError: string | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  requestedStoreName: string;
}

export interface SignUpResult {
  userId: string;
  sessionAvailable: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}