import { useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  getLocationCountByParentId,
  LocationHierarchyHeader,
  LocationHierarchyList,
  translatedCount,
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

export default function GrievanceCategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: categories = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ category: grievanceCategoriesCollection })
      .orderBy(({ category }) => category.name, "asc"),
  );

  const { data: types = [] } = useLiveQuery((q) => q.from({ type: grievanceTypesCollection }));

  const typeCountsByCategoryId = useMemo(() => {
    return getLocationCountByParentId(
      types.filter((type) => !isDeleted(type)),
      (type) => type.categoryId,
    );
  }, [types]);

  const visibleCategories = categories.filter((category) => !isDeleted(category));

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <LocationHierarchyHeader title={t("grievance_categories")} />
      <LocationHierarchyList
        emptyMessage={t("no_grievance_categories_synchronized")}
        isLoading={isLoading}
        data={visibleCategories}
        keyExtractor={(category) => String(category.id)}
        toItem={(category) => {
          const typeCount = typeCountsByCategoryId.get(category.id) ?? 0;
          const categoryName = category.name ?? t("unnamed_category");

          return {
            id: category.id,
            name: categoryName,
            countLabel: `${translatedCount(t, "type_count", typeCount)} · ${translateStatus(
              t,
              category.isActive === 0 ? "inactive" : "active",
            )}`,
            accessibilityLabel: t("view_grievance_types_in", { name: categoryName }),
            onPress: () =>
              router.push({
                pathname: "/account/synced-grievance-setup/types",
                params: { categoryId: String(category.id), categoryName },
              }),
          };
        }}
      />
    </StyledSafeAreaView>
  );
}
