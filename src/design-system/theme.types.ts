
export type ThemeMode = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  /** The user's selected preference. */
  theme: ThemeMode;

  /** The actual theme currently applied. */
  resolvedTheme: ResolvedTheme;

  /** Change the theme preference. */
  setTheme: (theme: ThemeMode) => void;

  /** Toggle between light and dark explicitly. */
  toggleTheme: () => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}
