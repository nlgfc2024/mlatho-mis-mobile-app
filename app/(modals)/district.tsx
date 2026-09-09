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
import { GraphQlDistrict } from "@/src/graphql/types";
import { goBackOrReplace } from "@/src/lib/navigation";
import { districtsCollection } from "@/src/powersync/collections";
import { toGraphQlDistrict } from "@/src/powersync/location-options";
import { locationStore } from "@/src/store/location-store";

export default function DistrictModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const { region, district } = useStore(locationStore, (state) => ({
    region: state.region,
    district: state.district,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const updateDistrict = (district: GraphQlDistrict) => {
    locationStore.setState((state) => {
      return { ...state, district, ward: null, village: null };
    });
  };

  const regionId = region?.id;
  const queryRegionId = regionId ?? "";
  const {
    data: districtRows = [],
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLiveInfiniteQuery(
    (q) => {
      const query = q
        .from({ district: districtsCollection })
        .where(({ district }) => eq(district.regionId, queryRegionId));
      const filtered = normalizedSearchQuery
        ? query.where(({ district }) => ilike(district.name, searchPattern))
        : query;

      return filtered
        .orderBy(({ district }) => district.name, "asc")
        .orderBy(({ district }) => district.id, "asc");
    },
    { pageSize: LOCATION_PICKER_PAGE_SIZE },
    [queryRegionId, normalizedSearchQuery],
  );

  if (!regionId) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-gray-500">{t("select_region_first")}</Text>
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
        data={districtRows}
        selectedId={district?.id}
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
          updateDistrict(toGraphQlDistrict(row));
          goBackOrReplace(router, "/account/location/create");
        }}
      />
    </StyledSafeAreaView>
  );
}
