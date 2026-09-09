import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

type TrainingOverviewCardProps = {
  total?: number;
  planned: number;
  submitted: number;
  approved: number;
  ongoing: number;
  completed: number;
};

export default function TrainingOverviewCard({
  total: suppliedTotal,
  planned,
  submitted,
  approved,
  ongoing,
  completed,
}: TrainingOverviewCardProps) {
  const { t } = useTranslation();

  const total = suppliedTotal ?? planned + submitted + approved + ongoing + completed;

  const metrics = [
    { key: "planned", label: t("planned"), value: planned },
    { key: "submitted", label: t("submitted"), value: submitted },
    { key: "approved", label: t("approved"), value: approved },
    { key: "ongoing", label: t("ongoing"), value: ongoing },
    { key: "completed", label: t("completed"), value: completed },
  ] as const;
  const metricRows = [metrics.slice(0, 2), metrics.slice(2, 4), metrics.slice(4, 5)];

  return (
    <View className="gap-4 p-5">
      <View className="items-start">
        <Text className="text-xs text-green-100">{t("total_trainings")}</Text>
        <Text className="text-4xl font-bold text-white">{total}</Text>
      </View>

      <View className="gap-3">
        {metricRows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-3">
            {row.map(({ key, label, value }) => (
              <View
                key={key}
                className="flex-1 flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"
              >
                <Text className="text-sm font-semibold text-white">{value}</Text>
                <Text className="text-sm text-green-100">{label}</Text>
                <View className="ml-auto size-2 rounded-full bg-white" />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
