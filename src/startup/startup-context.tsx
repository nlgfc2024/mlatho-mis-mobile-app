import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import {
  type PropsWithChildren,
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";

import { getDashboardGroupsForRole } from "@/src/components/dashboard/dashboard-groups";
import {
  accessProfileHasPermission,
  getAccessRoleRightIds,
} from "@/src/features/access-profile/permissions";
import { isImisAdministratorRole } from "@/src/features/access-profile/roles";
import { setActiveDashboardGroup, useActiveDashboardGroup } from "@/src/lib/active-dashboard";
import {
  getHouseholdSyncKey,
  getTargetedMembersSyncKey,
  GRIEVANCE_SETUP_SYNC_KEY,
  GRIEVANCE_SYNC_KEYS,
  isOnboardingComplete,
  LOCATION_SYNC_KEYS,
} from "@/src/onboarding/state";
import { syncMetadataCollection, villagesCollection } from "@/src/powersync/collections";
import { useSession } from "@/src/providers/session-context";
import { createLocationScopeKey } from "@/src/sync/current-user-location-scope";

import { useStartupNetworkState } from "./network-state";
import { StartupScreen } from "./startup-screen";
import { resolveStartupState, type StartupDestination } from "./startup-state";
import { StartupTransition } from "./startup-transition";

type StartupContextValue = {
  destination: StartupDestination;
  offline: boolean;
};

const StartupContext = createContext<StartupContextValue | null>(null);

const BASE_METADATA_KEYS = [
  ...LOCATION_SYNC_KEYS,
  ...GRIEVANCE_SYNC_KEYS,
  GRIEVANCE_SETUP_SYNC_KEY,
] as string[];

type StartupGateProps = PropsWithChildren;

function isDeleted(record: { deletedAt?: string | null; isDeleted?: number | null }) {
  return Boolean(record.deletedAt || record.isDeleted);
}

export function StartupGate({ children }: StartupGateProps) {
  const network = useStartupNetworkState();
  const {
    user,
    isReady: sessionResolved,
    isBiometricLocked,
    accessProfile,
    activeRole,
    isAccessProfileLoading,
    accessProfileError,
    refetchAccessProfile,
  } = useSession();

  const userReference = user?.reference ?? user?.id ?? null;
  const villageId = user?.villageId ? String(user.villageId) : null;
  const locationScopeKey = useMemo(() => {
    if (!userReference || !accessProfile) return null;
    const districtUuids = (accessProfile.userDistricts ?? [])
      .map((district) => district?.uuid?.trim() ?? "")
      .filter(Boolean);
    return createLocationScopeKey(String(userReference), districtUuids);
  }, [accessProfile, userReference]);
  const metadataKeys = useMemo(() => {
    if (!villageId) return BASE_METADATA_KEYS;
    return [
      ...BASE_METADATA_KEYS,
      getHouseholdSyncKey(villageId, userReference),
      getTargetedMembersSyncKey(villageId, userReference),
    ];
  }, [userReference, villageId]);

  const metadataQuery = useLiveQuery(
    (q) => {
      if (!userReference) return undefined;
      return q
        .from({ meta: syncMetadataCollection })
        .where(({ meta }) => inArray(meta.key, metadataKeys));
    },
    [metadataKeys, userReference],
  );
  const activeVillageQuery = useLiveQuery(
    (q) => {
      if (!userReference || !villageId) return undefined;
      return q
        .from({ village: villagesCollection })
        .where(({ village }) => eq(village.id, villageId));
    },
    [userReference, villageId],
  );

  const metadataReady = !userReference || metadataQuery.isReady;
  const activeVillageReady = !userReference || !villageId || activeVillageQuery.isReady;
  const localState =
    metadataQuery.isError || activeVillageQuery.isError
      ? "error"
      : metadataReady && activeVillageReady
        ? "ready"
        : "loading";

  const metadata = metadataQuery.data ?? [];
  const activeVillage = (activeVillageQuery.data ?? []).find((village) => !isDeleted(village));
  const householdSyncRequired = accessProfileHasPermission(accessProfile, [
    "gql_group_search_perms",
  ]);
  const targetedMembersSyncRequired = accessProfileHasPermission(accessProfile, [
    "gql_individual_search_perms",
  ]);
  const onboardingComplete =
    localState === "ready" &&
    Boolean(user) &&
    isOnboardingComplete({
      metadata: metadata.map((row) => ({
        key: row.key ?? row.id,
        value: row.value,
        status: row.status,
        cursor: row.cursor,
        locationId: row.locationId,
        userId: row.userId,
        error: row.error,
      })),
      hasSelectedVillage: Boolean(user?.hasLocation && villageId),
      activeVillageExists: Boolean(activeVillage),
      villageId,
      userReference,
      locationScopeKey,
      householdSyncRequired,
      targetedMembersSyncRequired,
    });

  const dashboardGroups = useMemo(
    () => getDashboardGroupsForRole(activeRole?.name, activeRole?.isSystem),
    [activeRole?.isSystem, activeRole?.name],
  );
  const activeDashboardId = useActiveDashboardGroup();
  const dashboardSelectionReady =
    dashboardGroups.length > 0 && dashboardGroups.some((group) => group.id === activeDashboardId);

  useLayoutEffect(() => {
    if (dashboardGroups.length > 0 && !dashboardSelectionReady) {
      // Reconcile while the startup screen is still mounted, so the first
      // dashboard paint uses a module granted to the resolved active role.
      setActiveDashboardGroup(dashboardGroups[0].id);
    }
  }, [dashboardGroups, dashboardSelectionReady]);

  const accessProfileState = accessProfile
    ? "available"
    : accessProfileError
      ? "error"
      : isAccessProfileLoading
        ? "loading"
        : "error";
  const resolution = resolveStartupState({
    sessionResolved,
    authenticated: Boolean(user?.isLoggedIn),
    biometricLocked: isBiometricLocked,
    networkResolved: network.resolved,
    online: network.online,
    localState,
    onboardingComplete,
    accessProfile: accessProfileState,
    hasRole: Boolean(activeRole),
    hasPermissions:
      isImisAdministratorRole(activeRole) || getAccessRoleRightIds(activeRole).size > 0,
    hasDashboard: dashboardGroups.length > 0,
    dashboardSelectionReady,
  });

  const retry = useCallback(async () => {
    const retries: Promise<unknown>[] = [refetchAccessProfile()];
    if (metadataQuery.isError) retries.push(syncMetadataCollection.preload());
    if (activeVillageQuery.isError) retries.push(villagesCollection.preload());
    await Promise.allSettled(retries);
  }, [activeVillageQuery.isError, metadataQuery.isError, refetchAccessProfile]);

  if (resolution.status === "loading") {
    return (
      <StartupScreen
        loadingReason={resolution.status === "loading" ? resolution.reason : undefined}
      />
    );
  }

  if (resolution.status === "error") {
    return <StartupScreen errorKind={resolution.kind} onRetry={() => void retry()} />;
  }

  return (
    <StartupContext.Provider
      value={{
        destination: resolution.destination,
        offline: resolution.offline,
      }}
    >
      <StartupTransition>{children}</StartupTransition>
    </StartupContext.Provider>
  );
}

export function useStartup() {
  const context = use(StartupContext);
  if (!context) {
    throw new Error("useStartup must be used within StartupGate");
  }
  return context;
}
