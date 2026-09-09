import { eq, ilike, useLiveInfiniteQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import Label from "@/src/components/form/label";
import { LOCATION_PICKER_PAGE_SIZE } from "@/src/components/form/location-picker-list";
import Select from "@/src/components/form/select";
import { districtsCollection } from "@/src/powersync/collections";
import { toGraphQlDistrict } from "@/src/powersync/location-options";
import { useFieldContext } from "@/src/providers/form-context";
import { locationStore } from "@/src/store/location-store";

interface ComponentProps {
  label: string;
  regionId?: string;
}

const DistrictField: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  const { region, district } = useStore(locationStore, (state) => ({
    region: state.region,
    district: state.district,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const regionId = region?.id;
  const queryRegionId = regionId ?? "";

  const {
    data: districtRows = [],
    isLoading,
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

  useEffect(() => {
    const value = district?.id ? String(district.id) : "";
    if (field.state.value !== value) {
      field.setValue(value);
    }
  }, [district?.id, field, field.state.value]);

  const districts = useMemo(() => {
    const options = districtRows.map((row) => ({ node: toGraphQlDistrict(row) }));
    if (district && !options.some(({ node }) => node.id === district.id)) {
      return [{ node: district }, ...options];
    }
    return options;
  }, [district, districtRows]);
  const selectedDistrictId = district?.id ?? "";
  const placeholder = !regionId
    ? t("select_region_first")
    : isLoading
      ? t("loading_districts")
      : districts.length
        ? t("select_district")
        : t("no_districts_found");

  const updateDistrict = (districtId: string) => {
    const nextDistrict = districts.find(({ node }) => node.id === districtId)?.node;

    if (!nextDistrict) return;

    locationStore.setState((state) => {
      return { ...state, district: nextDistrict, ward: null, village: null };
    });
  };

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={selectedDistrictId}
        onValueChange={updateDistrict}
        placeholder={placeholder}
        disabled={!regionId || isLoading || districts.length === 0}
        searchable
        searchPlaceholder={t("search_districts")}
        emptyMessage={t("no_districts_found")}
        onSearchTextChange={setSearchQuery}
        onEndReached={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      >
        {districts.map(({ node }) => (
          <Select.Option key={node.id} item={node.id}>
            {node.name}
          </Select.Option>
        ))}
      </Select>
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default DistrictField;
