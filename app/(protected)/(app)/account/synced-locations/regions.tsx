import { count, inArray, useLiveInfiniteQuery, useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  LOCATION_LIST_PAGE_SIZE,
  LocationHierarchyHeader,
  LocationHierarchyList,
  translatedCount,
} from "@/src/components/account/location-hierarchy-list";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { districtsCollection, regionsCollection } from "@/src/powersync/collections";

export default function RegionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    data: regions = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) =>
      q
        .from({ region: regionsCollection })
        .orderBy(({ region }) => region.name, "asc")
        .orderBy(({ region }) => region.id, "asc"),
    { pageSize: LOCATION_LIST_PAGE_SIZE },
    [],
  );

  const regionIds = useMemo(() => regions.map((region) => String(region.id)), [regions]);
  const regionIdsKey = JSON.stringify(regionIds);

  const { data: districtCounts = [] } = useLiveQuery(
    (q) => {
      if (regionIds.length === 0) return undefined;

      return q
        .from({ district: districtsCollection })
        .where(({ district }) => inArray(district.regionId, regionIds))
        .groupBy(({ district }) => district.regionId)
        .select(({ district }) => ({ regionId: district.regionId, count: count(district.id) }));
    },
    [regionIdsKey],
  );

  const districtCountsByRegionId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of districtCounts) {
      if (row.regionId) counts.set(String(row.regionId), Number(row.count));
    }
    return counts;
  }, [districtCounts]);

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <LocationHierarchyHeader title={t("regions")} />
      <LocationHierarchyList
        emptyMessage={t("no_regions_synchronized")}
        isLoading={isLoading}
        isError={isError}
        errorMessage={t("location_data_load_error")}
        data={regions}
        keyExtractor={(region) => String(region.id)}
        toItem={(region) => {
          const districtCount = districtCountsByRegionId.get(region.id) ?? 0;

          return {
            id: region.id,
            name: region.name,
            countLabel: translatedCount(t, "district_count", districtCount),
            accessibilityLabel: t("view_districts_in", { name: region.name }),
            onPress: () =>
              router.push({
                pathname: "/account/synced-locations/districts",
                params: { regionId: String(region.id), regionName: region.name },
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
