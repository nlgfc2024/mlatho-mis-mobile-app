import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, View } from "react-native";

import TrainingListItem from "@/src/components/training/training-list-item";
import { getUpcomingTrainings, toTraining } from "@/src/data/trainings";
import { trainingsCollection } from "@/src/powersync/collections";

export default function UpcomingTrainingsList() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  const { data: rows = [] } = useLiveQuery((q) =>
    q.from({ training: trainingsCollection }).orderBy(({ training }) => training.startDatetime),
  );
  const upcoming = useMemo(() => getUpcomingTrainings(rows.map(toTraining), 5), [rows]);

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between px-4">
        <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
          {t("upcoming_trainings")}
        </Text>

        <Link href={"/(protected)/(app)/training/all"} asChild push>
          <Pressable className="flex-row items-center gap-0.5">
            <Text className="text-sm font-medium text-green-900 dark:text-green-100">
              {t("view_all")}
            </Text>
            <ChevronRight size={16} color={isDark ? "#ffffff" : "#0d542b"} />
          </Pressable>
        </Link>
      </View>

      {upcoming.length > 0 ? (
        <View>
          {upcoming.map((training) => (
            <TrainingListItem key={training.id} training={training} />
          ))}
        </View>
      ) : (
        <Text className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("no_upcoming_trainings")}
        </Text>
      )}
    </View>
  );
}
