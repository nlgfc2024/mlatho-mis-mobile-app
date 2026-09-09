import { eq, useLiveInfiniteQuery } from "@tanstack/react-db";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  LOCATION_LIST_PAGE_SIZE,
  LocationHierarchyHeader,
  LocationHierarchyList,
} from "@/src/components/account/location-hierarchy-list";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { villagesCollection } from "@/src/powersync/collections";

export default function VillagesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ wardId?: string; wardName?: string }>();

  const wardId = params.wardId;
  const wardFilterId = wardId ?? "";
  const hasWardFilter = Boolean(wardId);
  const wardName = params.wardName;

  const {
    data: villages = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) => {
      const query = q.from({ village: villagesCollection });
      const filtered = hasWardFilter
        ? query.where(({ village }) => eq(village.wardId, wardFilterId))
        : query;

      return filtered
        .orderBy(({ village }) => village.name, "asc")
        .orderBy(({ village }) => village.id, "asc")
        .select(({ village }) => ({ id: village.id, name: village.name }));
    },
    { pageSize: LOCATION_LIST_PAGE_SIZE },
    [wardFilterId],
  );

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <Stack.Screen options={{ title: hasWardFilter ? t("villages") : t("all_villages") }} />
      <LocationHierarchyHeader
        title={hasWardFilter ? t("villages") : t("all_villages")}
        subtitle={hasWardFilter ? wardName : undefined}
      />
      <LocationHierarchyList
        emptyMessage={t("no_villages_synchronized")}
        isLoading={isLoading}
        isError={isError}
        errorMessage={t("location_data_load_error")}
        data={villages}
        keyExtractor={(village) => String(village.id)}
        toItem={(village) => ({
          id: village.id,
          name: village.name,
        })}
        onEndReached={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </StyledSafeAreaView>
  );
}
