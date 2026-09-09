import { eq, ilike, useLiveInfiniteQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import Label from "@/src/components/form/label";
import { LOCATION_PICKER_PAGE_SIZE } from "@/src/components/form/location-picker-list";
import Select from "@/src/components/form/select";
import { wardsCollection } from "@/src/powersync/collections";
import { toGraphQlWard } from "@/src/powersync/location-options";
import { useFieldContext } from "@/src/providers/form-context";
import { locationStore } from "@/src/store/location-store";

interface ComponentProps {
  label: string;
  districtId?: string;
}

const WardField: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  const { district, ward } = useStore(locationStore, (state) => ({
    district: state.district,
    ward: state.ward,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const districtId = district?.id;
  const queryDistrictId = districtId ?? "";

  const {
    data: wardRows = [],
    isLoading,
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

  useEffect(() => {
    const value = ward?.id ? String(ward.id) : "";
    if (field.state.value !== value) {
      field.setValue(value);
    }
  }, [field, field.state.value, ward?.id]);

  const wards = useMemo(() => {
    const options = wardRows.map((row) => ({ node: toGraphQlWard(row) }));
    if (ward && !options.some(({ node }) => node.id === ward.id)) {
      return [{ node: ward }, ...options];
    }
    return options;
  }, [ward, wardRows]);
  const selectedWardId = ward?.id ?? "";
  const placeholder = !districtId
    ? t("select_district_first")
    : isLoading
      ? t("loading_wards")
      : wards.length
        ? t("select_ward")
        : t("no_wards_found");

  const updateWard = (wardId: string) => {
    const nextWard = wards.find(({ node }) => node.id === wardId)?.node;

    if (!nextWard) return;

    locationStore.setState((state) => {
      return { ...state, ward: nextWard, village: null };
    });
  };

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={selectedWardId}
        onValueChange={updateWard}
        placeholder={placeholder}
        disabled={!districtId || isLoading || wards.length === 0}
        searchable
        searchPlaceholder={t("search_wards")}
        emptyMessage={t("no_wards_found")}
        onSearchTextChange={setSearchQuery}
        onEndReached={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      >
        {wards.map(({ node }) => (
          <Select.Option key={node.id} item={node.id}>
            {node.name}
          </Select.Option>
        ))}
      </Select>
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default WardField;
