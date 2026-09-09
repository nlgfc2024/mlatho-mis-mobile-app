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
import { districtsCollection, wardsCollection } from "@/src/powersync/collections";

export default function DistrictsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ regionId?: string; regionName?: string }>();

  const regionId = params.regionId;
  const regionFilterId = regionId ?? "";
  const hasRegionFilter = Boolean(regionId);
  const regionName = params.regionName;

  const {
    data: districts = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) => {
      const query = q.from({ district: districtsCollection });
      const filtered = hasRegionFilter
        ? query.where(({ district }) => eq(district.regionId, regionFilterId))
        : query;

      return filtered
        .orderBy(({ district }) => district.name, "asc")
        .orderBy(({ district }) => district.id, "asc");
    },
    { pageSize: LOCATION_LIST_PAGE_SIZE },
    [regionFilterId],
  );

  const districtIds = useMemo(() => districts.map((district) => String(district.id)), [districts]);
  const districtIdsKey = JSON.stringify(districtIds);

  const { data: wardCounts = [] } = useLiveQuery(
    (q) => {
      if (districtIds.length === 0) return undefined;

      return q
        .from({ ward: wardsCollection })
        .where(({ ward }) => inArray(ward.districtId, districtIds))
        .groupBy(({ ward }) => ward.districtId)
        .select(({ ward }) => ({ districtId: ward.districtId, count: count(ward.id) }));
    },
    [districtIdsKey],
  );

  const wardCountsByDistrictId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of wardCounts) {
      if (row.districtId) counts.set(String(row.districtId), Number(row.count));
    }
    return counts;
  }, [wardCounts]);

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <Stack.Screen options={{ title: hasRegionFilter ? t("districts") : t("all_districts") }} />
      <LocationHierarchyHeader
        title={hasRegionFilter ? t("districts") : t("all_districts")}
        subtitle={hasRegionFilter ? regionName : undefined}
      />
      <LocationHierarchyList
        emptyMessage={t("no_districts_synchronized")}
        isLoading={isLoading}
        isError={isError}
        errorMessage={t("location_data_load_error")}
        data={districts}
        keyExtractor={(district) => String(district.id)}
        toItem={(district) => {
          const wardCount = wardCountsByDistrictId.get(district.id) ?? 0;

          return {
            id: district.id,
            name: district.name,
            countLabel: translatedCount(t, "ward_count", wardCount),
            accessibilityLabel: t("view_wards_in", { name: district.name }),
            onPress: () =>
              router.push({
                pathname: "/account/synced-locations/wards",
                params: { districtId: String(district.id), districtName: district.name },
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
