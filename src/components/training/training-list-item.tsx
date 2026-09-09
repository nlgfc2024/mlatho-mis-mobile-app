import { Link } from "expo-router";
import { BookOpen, CalendarDays, MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { formatTrainingStatus, type Training } from "@/src/data/trainings";

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

function formatDate(date: string | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TrainingListItem({ training }: { training: Training }) {
  const { t } = useTranslation();
  const rowSeparatorStyle = useRowSeparatorStyle("top");

  return (
    <Link href={`/(protected)/(app)/training/${training.id}`} asChild push>
      <Pressable
        style={rowSeparatorStyle}
        className="flex-row items-start gap-3 px-4 py-3 focus:bg-pressed active:bg-pressed"
      >
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            <MapPin size={13} color="#6a7282" />
            <Text className="text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
              {training.venue || training.location.name || t("not_available")}
            </Text>
          </View>

          <Text
            className="text-base font-semibold text-gray-950 dark:text-gray-50"
            numberOfLines={1}
          >
            {training.title}
          </Text>

          {training.description ? (
            <Text className="text-sm text-gray-600 dark:text-gray-400" numberOfLines={2}>
              {training.description}
            </Text>
          ) : null}

          {training.code || training.paaReference ? (
            <Text className="text-sm text-gray-600 dark:text-gray-400" numberOfLines={1}>
              {[training.code, training.paaReference].filter(Boolean).join(" · ")}
            </Text>
          ) : null}

          <View className="mt-2 flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={13} color="#6a7282" />
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(training.startDatetime)}
              </Text>
            </View>

            <View className="flex-1 flex-row items-center gap-1.5">
              <BookOpen size={13} color="#6a7282" />
              <Text className="flex-1 text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
                {training.category.name || training.level.name || t("not_available")}
              </Text>
            </View>
          </View>
        </View>

        <View
          className={`rounded-full px-2.5 py-1 ${statusBadgeStyles[training.status] ?? "bg-gray-100 dark:bg-gray-800"}`}
        >
          <Text
            className={`text-xs font-medium ${statusTextStyles[training.status] ?? "text-gray-700 dark:text-gray-200"}`}
          >
            {training.status
              ? t(training.status, { defaultValue: formatTrainingStatus(training.status) })
              : t("not_available")}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
