import { ilike, useLiveInfiniteQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import {
  LOCATION_PICKER_PAGE_SIZE,
  LocationPickerList,
} from "@/src/components/form/location-picker-list";
import SearchInput from "@/src/components/form/search-input";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { GraphQlRegion } from "@/src/graphql/types";
import { goBackOrReplace } from "@/src/lib/navigation";
import { regionsCollection } from "@/src/powersync/collections";
import { toGraphQlRegion } from "@/src/powersync/location-options";
import { locationStore } from "@/src/store/location-store";

export default function RegionModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const region = useStore(locationStore, (state) => state.region);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const updateRegion = (region: GraphQlRegion) => {
    locationStore.setState((state) => {
      return { ...state, region, district: null, ward: null, village: null };
    });
  };

  const {
    data: regionRows = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) => {
      const query = q.from({ region: regionsCollection });
      const filtered = normalizedSearchQuery
        ? query.where(({ region }) => ilike(region.name, searchPattern))
        : query;

      return filtered
        .orderBy(({ region }) => region.name, "asc")
        .orderBy(({ region }) => region.id, "asc");
    },
    { pageSize: LOCATION_PICKER_PAGE_SIZE },
    [normalizedSearchQuery],
  );

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <View className="flex flex-row items-stretch gap-4 p-4">
        <View className="flex-1">
          <SearchInput
            value={searchQuery}
            placeholder={t("search")}
            onChangeText={setSearchQuery}
            onCancel={() => goBackOrReplace(router, "/account/location/create")}
          />
        </View>
      </View>

      <LocationPickerList
        data={regionRows}
        selectedId={region?.id}
        keyExtractor={(row) => String(row.id)}
        getLabel={(row) => row.name}
        emptyMessage={t("no_item_found")}
        isLoading={isLoading}
        isError={isError}
        errorMessage={t("location_data_load_error")}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        pageSize={LOCATION_PICKER_PAGE_SIZE}
        onSelect={(row) => {
          updateRegion(toGraphQlRegion(row));
          goBackOrReplace(router, "/account/location/create");
        }}
      />
    </StyledSafeAreaView>
  );
}
