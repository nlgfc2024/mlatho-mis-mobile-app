import { useLiveQuery } from "@tanstack/react-db";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import SearchInput from "@/src/components/form/search-input";
import TrainingFilterSheet from "@/src/components/training/training-filter-sheet";
import TrainingListItem from "@/src/components/training/training-list-item";
import ListFilterIcon from "@/src/components/ui/list-filter-icon";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import {
  countActiveFilters,
  emptyTrainingFilters,
  filterTrainings,
  toTraining,
  type TrainingFilters,
} from "@/src/data/trainings";
import { trainingsCollection } from "@/src/powersync/collections";

export default function AllTrainingsScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<TrainingFilters>(emptyTrainingFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { data: rows = [] } = useLiveQuery((q) =>
    q.from({ training: trainingsCollection }).orderBy(({ training }) => training.startDatetime),
  );
  const trainings = useMemo(() => rows.map(toTraining), [rows]);

  const activeCount = countActiveFilters(filters);
  const results = useMemo(
    () => filterTrainings(trainings, filters, query),
    [filters, query, trainings],
  );

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center gap-3 p-4">
        <View className="flex-1">
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onCancel={() => setQuery("")}
            placeholder={t("search_trainings")}
          />
        </View>

        <Pressable
          onPress={() => setIsFilterOpen(true)}
          className="rounded-full bg-gray-100 p-2.5 dark:bg-gray-800"
        >
          <ListFilterIcon color="#6a7282" />
          {activeCount > 0 ? (
            <View className="absolute -top-1 -right-1 min-w-4 items-center rounded-full bg-gray-500 px-1">
              <Text className="text-[10px] font-semibold text-white">{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-4">
        {results.length > 0 ? (
          results.map((training) => <TrainingListItem key={training.id} training={training} />)
        ) : (
          <Text className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("no_trainings_found")}
          </Text>
        )}
      </ScrollView>

      <TrainingFilterSheet
        visible={isFilterOpen}
        trainings={trainings}
        filters={filters}
        onApply={setFilters}
        onClose={() => setIsFilterOpen(false)}
      />
    </StyledSafeAreaView>
  );
}
