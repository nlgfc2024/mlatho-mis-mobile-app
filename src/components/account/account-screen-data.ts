import type { SessionUser } from "@/src/providers/session-context";
import { and, count, eq, inArray, isNull, or, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useMemo } from "react";

import {
  districtsCollection,
  grievanceCategoriesCollection,
  grievanceChannelsCollection,
  grievanceTypesCollection,
  householdsCollection,
  regionsCollection,
  targetedMembersCollection,
  userLocationsCollection,
  villagesCollection,
  wardsCollection,
} from "@/src/powersync/collections";
import { upsertLocalRecord } from "@/src/powersync/remote-sync";

export type AccountLocation = {
  id: string;
  userId?: string | null;
  regionId?: string | null;
  districtId?: string | null;
  wardId?: string | null;
  villageId?: string | null;
  deletedAt?: string | null;
};

export type CountState = {
  count: number | null;
  isError: boolean;
  isLoading: boolean;
};

export type ActiveCountState = CountState & {
  activeCount: number | null;
};

function countState(result: {
  data?: readonly { total: number }[];
  isError: boolean;
  isLoading: boolean;
}): CountState {
  const firstRow = result.data?.[0];
  const value = firstRow?.total ?? (result.data && !result.isLoading ? 0 : undefined);
  const hasValue = typeof value === "number";

  return {
    count: hasValue ? value : null,
    isError: result.isError && !hasValue,
    isLoading: result.isLoading && !hasValue,
  };
}

function activeCountState(result: {
  data?: readonly { isActive: number | null; total: number }[];
  isError: boolean;
  isLoading: boolean;
}): ActiveCountState {
  if (!result.data || (result.data.length === 0 && result.isLoading)) {
    return {
      count: null,
      activeCount: null,
      isError: result.isError,
      isLoading: result.isLoading,
    };
  }

  let total = 0;
  let activeTotal = 0;
  for (const row of result.data) {
    total += row.total;
    if (row.isActive === 1) activeTotal += row.total;
  }

  return {
    count: total,
    activeCount: activeTotal,
    isError: false,
    isLoading: false,
  };
}

export function useAccountLocations(user: SessionUser | null) {
  const userId = user?.id ?? null;
  const activeVillageId = user?.villageId ? String(user.villageId) : null;

  const locationsQuery = useLiveQuery(
    (q) => {
      if (!userId) return undefined;
      return q
        .from({ location: userLocationsCollection })
        .where(({ location }) => eq(location.userId, userId));
    },
    [userId],
  );
  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  const displayLocations = useMemo<AccountLocation[]>(() => {
    const byVillageId = new Map<string, AccountLocation>();
    const withoutVillageId: AccountLocation[] = [];

    for (const location of locations) {
      if (location.deletedAt) continue;
      if (!location.villageId) {
        withoutVillageId.push(location);
        continue;
      }
      byVillageId.set(String(location.villageId), location);
    }

    if (userId && activeVillageId && !byVillageId.has(activeVillageId)) {
      byVillageId.set(activeVillageId, {
        id: `${userId}:${activeVillageId}`,
        userId,
        regionId: user?.regionId ?? "",
        districtId: user?.districtId ?? "",
        wardId: user?.wardId ?? "",
        villageId: activeVillageId,
        deletedAt: null,
      });
    }

    return [...byVillageId.values(), ...withoutVillageId].sort((left, right) => {
      if (left.villageId === activeVillageId) return -1;
      if (right.villageId === activeVillageId) return 1;
      return (left.villageId ?? left.id).localeCompare(right.villageId ?? right.id);
    });
  }, [activeVillageId, locations, user?.districtId, user?.regionId, user?.wardId, userId]);

  const villageIds = useMemo(
    () =>
      displayLocations
        .map((location) => location.villageId)
        .filter((id): id is string => Boolean(id)),
    [displayLocations],
  );
  const villageIdsKey = villageIds.join("\u0000");

  const villagesQuery = useLiveQuery(
    (q) => {
      if (villageIds.length === 0) return undefined;
      return q
        .from({ village: villagesCollection })
        .where(({ village }) => inArray(village.id, villageIds))
        .where(({ village }) => isNull(village.deletedAt));
    },
    [villageIdsKey],
  );

  const householdCountsQuery = useLiveQuery(
    (q) => {
      if (villageIds.length === 0) return undefined;
      return q
        .from({ household: householdsCollection })
        .where(({ household }) => inArray(household.villageId, villageIds))
        .where(({ household }) => isNull(household.deletedAt))
        .groupBy(({ household }) => household.villageId)
        .select(({ household }) => ({
          villageId: household.villageId,
          total: count(household.id),
        }));
    },
    [villageIdsKey],
  );

  const targetedMemberCountsQuery = useLiveQuery(
    (q) => {
      if (villageIds.length === 0) return undefined;
      return q
        .from({ member: targetedMembersCollection })
        .where(({ member }) => inArray(member.villageId, villageIds))
        .where(({ member }) =>
          and(isNull(member.deletedAt), or(isNull(member.isDeleted), eq(member.isDeleted, 0))),
        )
        .groupBy(({ member }) => member.villageId)
        .select(({ member }) => ({
          villageId: member.villageId,
          total: count(member.id),
        }));
    },
    [villageIdsKey],
  );

  useEffect(() => {
    if (!locationsQuery.isReady || !userId || !activeVillageId) return;
    if (
      locations.some((location) => location.villageId === activeVillageId && !location.deletedAt)
    ) {
      return;
    }

    const timestamp = new Date().toISOString();
    void upsertLocalRecord(userLocationsCollection, {
      id: `${userId}:${activeVillageId}`,
      userId,
      regionId: user?.regionId ?? "",
      districtId: user?.districtId ?? "",
      wardId: user?.wardId ?? "",
      villageId: activeVillageId,
      synchronizedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }).catch((error) => {
      console.error("Failed to backfill user location", error);
    });
  }, [
    activeVillageId,
    locations,
    locationsQuery.isReady,
    user?.districtId,
    user?.regionId,
    user?.wardId,
    userId,
  ]);

  const villageById = useMemo(
    () => new Map((villagesQuery.data ?? []).map((village) => [village.id, village])),
    [villagesQuery.data],
  );
  const householdCountByVillageId = useMemo(
    () =>
      new Map((householdCountsQuery.data ?? []).map((row) => [String(row.villageId), row.total])),
    [householdCountsQuery.data],
  );
  const targetedMemberCountByVillageId = useMemo(
    () =>
      new Map(
        (targetedMemberCountsQuery.data ?? []).map((row) => [String(row.villageId), row.total]),
      ),
    [targetedMemberCountsQuery.data],
  );

  return {
    activeVillageId,
    displayLocations,
    householdCountByVillageId,
    targetedMemberCountByVillageId,
    villageById,
    isLocationsLoading: locationsQuery.isLoading && displayLocations.length === 0,
    isNamesLoading: villagesQuery.isLoading && villageById.size === 0,
    areCountsLoading:
      (householdCountsQuery.isLoading && householdCountByVillageId.size === 0) ||
      (targetedMemberCountsQuery.isLoading && targetedMemberCountByVillageId.size === 0),
    hasError:
      locationsQuery.isError ||
      villagesQuery.isError ||
      householdCountsQuery.isError ||
      targetedMemberCountsQuery.isError,
  };
}

export function useSyncedLocationCounts() {
  const regions = useLiveQuery(
    (q) =>
      q
        .from({ region: regionsCollection })
        .where(({ region }) => isNull(region.deletedAt))
        .select(({ region }) => ({ total: count(region.id) })),
    [],
  );
  const districts = useLiveQuery(
    (q) =>
      q
        .from({ district: districtsCollection })
        .where(({ district }) => isNull(district.deletedAt))
        .select(({ district }) => ({ total: count(district.id) })),
    [],
  );
  const wards = useLiveQuery(
    (q) =>
      q
        .from({ ward: wardsCollection })
        .where(({ ward }) => isNull(ward.deletedAt))
        .select(({ ward }) => ({ total: count(ward.id) })),
    [],
  );
  const villages = useLiveQuery(
    (q) =>
      q
        .from({ village: villagesCollection })
        .where(({ village }) => isNull(village.deletedAt))
        .select(({ village }) => ({ total: count(village.id) })),
    [],
  );

  return {
    regions: countState(regions),
    districts: countState(districts),
    wards: countState(wards),
    villages: countState(villages),
  };
}

export function useSyncedGrievanceCounts() {
  const categories = useLiveQuery(
    (q) =>
      q
        .from({ category: grievanceCategoriesCollection })
        .where(({ category }) =>
          and(
            isNull(category.deletedAt),
            or(isNull(category.isDeleted), eq(category.isDeleted, 0)),
          ),
        )
        .groupBy(({ category }) => category.isActive)
        .select(({ category }) => ({
          isActive: category.isActive,
          total: count(category.id),
        })),
    [],
  );
  const types = useLiveQuery(
    (q) =>
      q
        .from({ type: grievanceTypesCollection })
        .where(({ type }) =>
          and(isNull(type.deletedAt), or(isNull(type.isDeleted), eq(type.isDeleted, 0))),
        )
        .groupBy(({ type }) => type.isActive)
        .select(({ type }) => ({
          isActive: type.isActive,
          total: count(type.id),
        })),
    [],
  );
  const channels = useLiveQuery(
    (q) =>
      q
        .from({ channel: grievanceChannelsCollection })
        .where(({ channel }) =>
          and(isNull(channel.deletedAt), or(isNull(channel.isDeleted), eq(channel.isDeleted, 0))),
        )
        .groupBy(({ channel }) => channel.isActive)
        .select(({ channel }) => ({
          isActive: channel.isActive,
          total: count(channel.id),
        })),
    [],
  );

  return {
    categories: activeCountState(categories),
    types: activeCountState(types),
    channels: activeCountState(channels),
  };
}
