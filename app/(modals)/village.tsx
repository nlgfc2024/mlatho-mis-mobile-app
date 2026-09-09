import { eq, ilike, useLiveInfiniteQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import {
  LOCATION_PICKER_PAGE_SIZE,
  LocationPickerList,
} from "@/src/components/form/location-picker-list";
import SearchInput from "@/src/components/form/search-input";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { GraphQlVillage } from "@/src/graphql/types";
import { goBackOrReplace } from "@/src/lib/navigation";
import { villagesCollection } from "@/src/powersync/collections";
import { toGraphQlVillage } from "@/src/powersync/location-options";
import { locationStore } from "@/src/store/location-store";

export default function VillageModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const { ward, village } = useStore(locationStore, (state) => ({
    ward: state.ward,
    village: state.village,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const wardId = ward?.id;
  const queryWardId = wardId ?? "";
  const updateVillage = (village: GraphQlVillage) => {
    locationStore.setState((state) => {
      return { ...state, village };
    });
  };

  const {
    data: villageRows = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) => {
      const query = q
        .from({ village: villagesCollection })
        .where(({ village }) => eq(village.wardId, queryWardId));
      const filtered = normalizedSearchQuery
        ? query.where(({ village }) => ilike(village.name, searchPattern))
        : query;

      return filtered
        .orderBy(({ village }) => village.name, "asc")
        .orderBy(({ village }) => village.id, "asc");
    },
    { pageSize: LOCATION_PICKER_PAGE_SIZE },
    [queryWardId, normalizedSearchQuery],
  );

  if (!wardId) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-gray-500">{t("select_ward_first")}</Text>
        </View>
      </StyledSafeAreaView>
    );
  }

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
        data={villageRows}
        selectedId={village?.id}
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
          updateVillage(toGraphQlVillage(row));
          goBackOrReplace(router, "/account/location/create");
        }}
      />
    </StyledSafeAreaView>
  );
}
