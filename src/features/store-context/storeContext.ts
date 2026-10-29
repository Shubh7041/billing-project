import { createContext, useContext } from "react";

export type StoreRole = "owner" | "manager" | "cashier" | "inventory_clerk";

export interface AppProfile {
  id: string;
  displayName: string;
  isActive: boolean;
}

export interface StoreSummary {
  id: string;
  name: string;
  currencyCode: string;
  timezone: string;
}

export interface StoreMembership {
  userId: string;
  role: StoreRole;
  store: StoreSummary;
}

export type StoreContextValue =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "profile-missing" }
  | { status: "profile-inactive" }
  | { status: "membership-missing" }
  | { status: "membership-inactive" }
  | { status: "store-unavailable" }
  | { status: "ready"; profile: AppProfile; membership: StoreMembership };

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStoreContext(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStoreContext must be used within StoreContextProvider.");
  }
  return context;
}