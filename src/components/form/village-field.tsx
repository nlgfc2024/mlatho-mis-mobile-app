import { eq, ilike, useLiveInfiniteQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import Label from "@/src/components/form/label";
import { LOCATION_PICKER_PAGE_SIZE } from "@/src/components/form/location-picker-list";
import Select from "@/src/components/form/select";
import { villagesCollection } from "@/src/powersync/collections";
import { toGraphQlVillage } from "@/src/powersync/location-options";
import { useFieldContext } from "@/src/providers/form-context";
import { locationStore } from "@/src/store/location-store";

interface ComponentProps {
  label: string;
  wardId?: string;
}

const VillageField: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  const { ward, village } = useStore(locationStore, (state) => ({
    ward: state.ward,
    village: state.village,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const searchPattern = `%${normalizedSearchQuery}%`;

  const wardId = ward?.id;
  const queryWardId = wardId ?? "";

  const {
    data: villageRows = [],
    isLoading,
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

  useEffect(() => {
    const value = village?.id ? String(village.id) : "";
    if (field.state.value !== value) {
      field.setValue(value);
    }
  }, [field, field.state.value, village?.id]);

  const villages = useMemo(() => {
    const options = villageRows.map((row) => ({ node: toGraphQlVillage(row) }));
    if (village && !options.some(({ node }) => node.id === village.id)) {
      return [{ node: village }, ...options];
    }
    return options;
  }, [village, villageRows]);
  const selectedVillageId = village?.id ?? "";
  const placeholder = !wardId
    ? t("select_ward_first")
    : isLoading
      ? t("loading_villages")
      : villages.length
        ? t("select_village")
        : t("no_villages_found");

  const updateVillage = (villageId: string) => {
    const nextVillage = villages.find(({ node }) => node.id === villageId)?.node;

    if (!nextVillage) return;

    locationStore.setState((state) => {
      return { ...state, village: nextVillage };
    });
  };

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={selectedVillageId}
        onValueChange={updateVillage}
        placeholder={placeholder}
        disabled={!wardId || isLoading || villages.length === 0}
        searchable
        searchPlaceholder={t("search_villages")}
        emptyMessage={t("no_villages_found")}
        onSearchTextChange={setSearchQuery}
        onEndReached={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      >
        {villages.map(({ node }) => (
          <Select.Option key={node.id} item={node.id}>
            {node.name}
          </Select.Option>
        ))}
      </Select>
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default VillageField;
