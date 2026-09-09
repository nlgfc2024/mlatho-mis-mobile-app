import { eq, useLiveQuery } from "@tanstack/react-db";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  LocationHierarchyHeader,
  LocationHierarchyList,
} from "@/src/components/account/location-hierarchy-list";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translateStatus } from "@/src/i18n/helpers";
import {
  grievanceCategoriesCollection,
  grievanceTypesCollection,
} from "@/src/powersync/collections";

function isDeleted(record: { deletedAt?: string | null; isDeleted?: number | null }) {
  return Boolean(record.deletedAt || record.isDeleted);
}

export default function GrievanceTypesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();

  const categoryId = params.categoryId;
  const hasCategoryFilter = Boolean(categoryId);
  const categoryName = params.categoryName;

  const { data: types = [], isLoading } = useLiveQuery(
    (q) => {
      const query = q
        .from({ type: grievanceTypesCollection })
        .orderBy(({ type }) => type.name, "asc");
      return hasCategoryFilter ? query.where(({ type }) => eq(type.categoryId, categoryId)) : query;
    },
    [categoryId],
  );

  const { data: categories = [] } = useLiveQuery((q) =>
    q.from({ category: grievanceCategoriesCollection }),
  );

  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const visibleTypes = types.filter((type) => !isDeleted(type));

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <Stack.Screen options={{ title: hasCategoryFilter ? t("types") : t("all_types") }} />
      <LocationHierarchyHeader
        title={hasCategoryFilter ? t("types") : t("all_grievance_types")}
        subtitle={hasCategoryFilter ? categoryName : undefined}
      />
      <LocationHierarchyList
        emptyMessage={t("no_grievance_types_synchronized")}
        isLoading={isLoading}
        data={visibleTypes}
        keyExtractor={(type) => String(type.id)}
        toItem={(type) => {
          const category = type.categoryId ? categoryById.get(type.categoryId) : null;
          const categoryLabel = category?.name ?? t("no_category");

          return {
            id: type.id,
            name: type.name ?? t("unnamed_type"),
            countLabel: `${translateStatus(
              t,
              type.isActive === 0 ? "inactive" : "active",
            )} · ${categoryLabel}`,
          };
        }}
      />
    </StyledSafeAreaView>
  );
}
