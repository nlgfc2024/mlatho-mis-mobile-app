import { ilike, useLiveInfiniteQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import Label from "@/src/components/form/label";
import { LOCATION_PICKER_PAGE_SIZE } from "@/src/components/form/location-picker-list";
import Select from "@/src/components/form/select";
import { regionsCollection } from "@/src/powersync/collections";
import { toGraphQlRegion } from "@/src/powersync/location-options";
import { useFieldContext } from "@/src/providers/form-context";
import { locationStore } from "@/src/store/location-store";

interface ComponentProps {
  label: string;
}

const RegionField: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  const region = useStore(locationStore, (state) => state.region);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const {
    data: regionRows = [],
    isLoading,
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

  useEffect(() => {
    const value = region?.id ? String(region.id) : "";
    if (field.state.value !== value) {
      field.setValue(value);
    }
  }, [field, field.state.value, region?.id]);

  const regions = useMemo(() => {
    const options = regionRows.map((row) => ({ node: toGraphQlRegion(row) }));
    if (region && !options.some(({ node }) => node.id === region.id)) {
      return [{ node: region }, ...options];
    }
    return options;
  }, [region, regionRows]);
  const selectedRegionId = region?.id ?? "";
  const placeholder = isLoading
    ? t("loading_regions")
    : regions.length
      ? t("select_region")
      : t("no_regions_found");

  const updateRegion = (regionId: string) => {
    const nextRegion = regions.find(({ node }) => node.id === regionId)?.node;

    if (!nextRegion) return;

    locationStore.setState((state) => {
      return { ...state, region: nextRegion, district: null, ward: null, village: null };
    });
  };

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={selectedRegionId}
        onValueChange={updateRegion}
        placeholder={placeholder}
        disabled={isLoading || regions.length === 0}
        searchable
        searchPlaceholder={t("search_regions")}
        emptyMessage={t("no_regions_found")}
        onSearchTextChange={setSearchQuery}
        onEndReached={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      >
        {regions.map(({ node }) => (
          <Select.Option key={node.id} item={node.id}>
            {node.name}
          </Select.Option>
        ))}
      </Select>
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default RegionField;
