import { count, eq, inArray, useLiveInfiniteQuery, useLiveQuery } from "@tanstack/react-db";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  LOCATION_LIST_PAGE_SIZE,
  LocationHierarchyHeader,
  LocationHierarchyList,
  translatedCount,
} from "@/src/components/account/location-hierarchy-list";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { villagesCollection, wardsCollection } from "@/src/powersync/collections";

export default function WardsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ districtId?: string; districtName?: string }>();

  const districtId = params.districtId;
  const districtFilterId = districtId ?? "";
  const hasDistrictFilter = Boolean(districtId);
  const districtName = params.districtName;

  const {
    data: wards = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) => {
      const query = q.from({ ward: wardsCollection });
      const filtered = hasDistrictFilter
        ? query.where(({ ward }) => eq(ward.districtId, districtFilterId))
        : query;

      return filtered
        .orderBy(({ ward }) => ward.name, "asc")
        .orderBy(({ ward }) => ward.id, "asc");
    },
    { pageSize: LOCATION_LIST_PAGE_SIZE },
    [districtFilterId],
  );

  const wardIds = useMemo(() => wards.map((ward) => String(ward.id)), [wards]);
  const wardIdsKey = JSON.stringify(wardIds);

  // Count villages per ward with a grouped aggregate instead of loading the
  // entire villages collection into JS just to tally it.
  const { data: villageCounts = [] } = useLiveQuery(
    (q) => {
      if (wardIds.length === 0) return undefined;

      return q
        .from({ village: villagesCollection })
        .where(({ village }) => inArray(village.wardId, wardIds))
        .groupBy(({ village }) => village.wardId)
        .select(({ village }) => ({ wardId: village.wardId, count: count(village.id) }));
    },
    [wardIdsKey],
  );

  const villageCountsByWardId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of villageCounts) {
      if (row.wardId) counts.set(String(row.wardId), Number(row.count));
    }
    return counts;
  }, [villageCounts]);

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <Stack.Screen options={{ title: hasDistrictFilter ? t("wards") : t("all_wards") }} />
      <LocationHierarchyHeader
        title={hasDistrictFilter ? t("wards") : t("all_wards")}
        subtitle={hasDistrictFilter ? districtName : undefined}
      />
      <LocationHierarchyList
        emptyMessage={t("no_wards_synchronized")}
        isLoading={isLoading}
        isError={isError}
        errorMessage={t("location_data_load_error")}
        data={wards}
        keyExtractor={(ward) => String(ward.id)}
        toItem={(ward) => {
          const villageCount = villageCountsByWardId.get(ward.id) ?? 0;

          return {
            id: ward.id,
            name: ward.name,
            countLabel: translatedCount(t, "village_count", villageCount),
            accessibilityLabel: t("view_villages_in", { name: ward.name }),
            onPress: () =>
              router.push({
                pathname: "/account/synced-locations/villages",
                params: { wardId: String(ward.id), wardName: ward.name },
              }),
          };
        }}
        onEndReached={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </StyledSafeAreaView>
  );
}
