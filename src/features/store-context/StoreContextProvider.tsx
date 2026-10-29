import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/authContext";
import { supabase } from "../../lib/supabase/client";
import { StoreContext } from "./storeContext";
import type { AppProfile, StoreMembership, StoreRole, StoreSummary } from "./storeContext";

interface StoreContextProviderProps {
  children: ReactNode;
}

type StoreContextData =
  | { status: "profile-missing" }
  | { status: "profile-inactive" }
  | { status: "membership-missing" }
  | { status: "membership-inactive" }
  | { status: "store-unavailable" }
  | { status: "ready"; profile: AppProfile; memberships: StoreMembership[] };

interface MembershipRow {
  store_id: string;
  user_id: string;
  role: StoreRole;
  is_active: boolean;
}

interface StoreRow {
  id: string;
  name: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
}

const validRoles: readonly string[] = ["owner", "manager", "cashier", "inventory_clerk"];

async function loadStoreContext(userId: string): Promise<StoreContextData> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not read the signed-in user's profile: ${profileError.message}`);
  }
  if (!profileRow) return { status: "profile-missing" };

  const profileData = profileRow as { id: string; display_name: string; is_active: boolean };
  const profile: AppProfile = {
    id: profileData.id,
    displayName: profileData.display_name,
    isActive: profileData.is_active,
  };
  if (!profile.isActive) return { status: "profile-inactive" };

  const { data: membershipRows, error: membershipError } = await supabase
    .from("store_memberships")
    .select("store_id, user_id, role, is_active")
    .eq("user_id", userId);

  if (membershipError) {
    throw new Error(`Could not read store memberships for the signed-in user: ${membershipError.message}`);
  }
  const memberships = (membershipRows ?? []) as MembershipRow[];
  if (memberships.length === 0) return { status: "membership-missing" };

  const activeMemberships = memberships.filter((membership) => membership.is_active);
  if (activeMemberships.length === 0) return { status: "membership-inactive" };

  if (activeMemberships.some((membership) => !validRoles.includes(membership.role))) {
    throw new Error("A store membership has an unsupported role value.");
  }

  const storeIds = [...new Set(activeMemberships.map((membership) => membership.store_id))];
  const { data: storeRows, error: storesError } = await supabase
    .from("stores")
    .select("id, name, currency_code, timezone, is_active")
    .in("id", storeIds)
    .eq("is_active", true);

  if (storesError) {
    throw new Error(`Could not read authorized store details: ${storesError.message}`);
  }

  const storeById = new Map(
    ((storeRows ?? []) as StoreRow[]).map((store) => [store.id, store]),
  );
  const activeStoreMemberships: StoreMembership[] = activeMemberships.flatMap((membership) => {
    const store = storeById.get(membership.store_id);
    if (!store?.is_active) return [];

    const summary: StoreSummary = {
      id: store.id,
      name: store.name,
      currencyCode: store.currency_code,
      timezone: store.timezone,
    };
    return [{ userId: membership.user_id, role: membership.role, store: summary }];
  });

  if (activeStoreMemberships.length === 0) return { status: "store-unavailable" };
  if (activeStoreMemberships.length > 1) {
    throw new Error("This application is configured for one store, but multiple active store memberships were found. Ask an administrator to review the records.");
  }
  return { status: "ready", profile, memberships: activeStoreMemberships };
}

export function StoreContextProvider({ children }: StoreContextProviderProps) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const userId = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ["app-store-context", userId],
    queryFn: () => loadStoreContext(userId as string),
    enabled: userId !== null,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const value = useMemo(() => {
    if (isAuthLoading) return { status: "loading" } as const;
    if (!session) return { status: "signed-out" } as const;
    if (query.isPending || query.isFetching) return { status: "loading" } as const;
    if (query.isError) {
      return {
        status: "error",
        message: query.error instanceof Error ? query.error.message : "Unable to resolve store access.",
        retry: () => { void query.refetch(); },
      } as const;
    }

    const data = query.data;
    if (!data) return { status: "loading" } as const;
    if (data.status !== "ready") return data;

    const profile = data.profile as AppProfile;
    const memberships = data.memberships as StoreMembership[];
    return { status: "ready", profile, membership: memberships[0] } as const;
  }, [isAuthLoading, query, session]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}