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
import { GraphQlWard } from "@/src/graphql/types";
import { goBackOrReplace } from "@/src/lib/navigation";
import { wardsCollection } from "@/src/powersync/collections";
import { toGraphQlWard } from "@/src/powersync/location-options";
import { locationStore } from "@/src/store/location-store";

export default function WardModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const { district, ward } = useStore(locationStore, (state) => ({
    district: state.district,
    ward: state.ward,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const updateWard = (ward: GraphQlWard) => {
    locationStore.setState((state) => {
      return { ...state, ward, village: null };
    });
  };

  const districtId = district?.id;
  const queryDistrictId = districtId ?? "";
  const {
    data: wardRows = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) => {
      const query = q
        .from({ ward: wardsCollection })
        .where(({ ward }) => eq(ward.districtId, queryDistrictId));
      const filtered = normalizedSearchQuery
        ? query.where(({ ward }) => ilike(ward.name, searchPattern))
        : query;

      return filtered
        .orderBy(({ ward }) => ward.name, "asc")
        .orderBy(({ ward }) => ward.id, "asc");
    },
    { pageSize: LOCATION_PICKER_PAGE_SIZE },
    [queryDistrictId, normalizedSearchQuery],
  );

  if (!districtId) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-gray-500">{t("select_district_first")}</Text>
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
        data={wardRows}
        selectedId={ward?.id}
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
          updateWard(toGraphQlWard(row));
          goBackOrReplace(router, "/account/location/create");
        }}
      />
    </StyledSafeAreaView>
  );
}
