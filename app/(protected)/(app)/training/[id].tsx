import { eq, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams } from "expo-router";
import { BookOpen, CalendarDays, Hash, MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { formatTrainingStatus, toTraining } from "@/src/data/trainings";
import { trainingsCollection } from "@/src/powersync/collections";

const statusBadgeStyles: Record<string, string> = {
  planned: "bg-blue-100 dark:bg-blue-950",
  approved: "bg-green-100 dark:bg-green-950",
  ongoing: "bg-amber-100 dark:bg-amber-950",
  completed: "bg-green-100 dark:bg-green-950",
};

const statusTextStyles: Record<string, string> = {
  planned: "text-blue-800 dark:text-blue-100",
  approved: "text-green-800 dark:text-green-100",
  ongoing: "text-amber-800 dark:text-amber-100",
  completed: "text-green-800 dark:text-green-100",
};

function formatDateTime(date: string | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-4 border-t border-gray-100 py-3 dark:border-gray-800">
      <Text className="w-28 text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="flex-1 text-sm font-medium text-gray-950 dark:text-gray-50">
        {value || "—"}
      </Text>
    </View>
  );
}

export default function TrainingDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rows = [], isLoading } = useLiveQuery(
    (q) =>
      q.from({ training: trainingsCollection }).where(({ training }) => eq(training.id, id ?? "")),
    [id],
  );
  const training = rows[0] ? toTraining(rows[0]) : null;

  if (isLoading) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator color="#0d542b" />
      </StyledSafeAreaView>
    );
  }

  if (!training) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-sm text-gray-500 dark:text-gray-300">
            {t("training_not_found")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="gap-3">
          <View
            className={`self-start rounded-full px-2.5 py-1 ${statusBadgeStyles[training.status] ?? "bg-gray-100 dark:bg-gray-800"}`}
          >
            <Text
              className={`text-xs font-medium ${statusTextStyles[training.status] ?? "text-gray-700 dark:text-gray-200"}`}
            >
              {training.status
                ? t(training.status, { defaultValue: formatTrainingStatus(training.status) })
                : t("not_available")}
            </Text>
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color="#6a7282" />
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {training.venue || training.location.name || t("not_available")}
              </Text>
            </View>
            <Text className="text-xl font-bold text-gray-950 dark:text-gray-50">
              {training.title}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={14} color="#6a7282" />
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(training.startDatetime)}
              </Text>
            </View>
          </View>
        </View>

        {training.description ? (
          <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">
            {training.description}
          </Text>
        ) : null}

        <View className="rounded-2xl bg-gray-50 px-4 dark:bg-gray-900">
          <DetailRow label={t("code")} value={training.code} />
          <DetailRow label={t("paa_reference")} value={training.paaReference} />
          <DetailRow label={t("training_category")} value={training.category.name} />
          <DetailRow label={t("training_level")} value={training.level.name} />
          <DetailRow label={t("location")} value={training.location.name} />
          <DetailRow label={t("starts_at")} value={formatDateTime(training.startDatetime)} />
          <DetailRow label={t("ends_at")} value={formatDateTime(training.endDatetime)} />
          <DetailRow label={t("date_created")} value={formatDateTime(training.dateCreated)} />
        </View>

        <View className="flex-row items-center gap-2 px-1">
          {training.code ? <Hash size={14} color="#6a7282" /> : null}
          {training.category.name ? <BookOpen size={14} color="#6a7282" /> : null}
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {[training.code, training.category.name, training.level.name]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
