import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import ProgressRing from "@/src/components/ui/progress-ring";

type AttendancePerformanceCardProps = {
  expected: number;
  actual: number;
};

export default function AttendancePerformanceCard({
  expected,
  actual,
}: AttendancePerformanceCardProps) {
  const { t } = useTranslation();

  const percentage = expected > 0 ? Math.round((actual / expected) * 100) : 0;

  return (
    <View className="flex-row items-center gap-4 p-5">
      <ProgressRing
        progress={percentage}
        size={96}
        strokeWidth={11}
        gapSize={6}
        strokeCap="round"
        color="#ffffff"
        trackColor="rgba(255, 255, 255, 0.2)"
      >
        <Text className="text-base font-bold text-white">{percentage}%</Text>
        <Text className="text-[10px] tracking-wide text-green-100">{t("attendance")}</Text>
      </ProgressRing>

      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-white">{t("attendance_performance")}</Text>
        <Text className="pb-3 text-xs text-green-100">
          {t("attendance_performance_subtitle")}
        </Text>

        <View className="bg-white/15" style={{ height: StyleSheet.hairlineWidth }} />

        <View className="mt-3 flex-row gap-6">
          <View className="flex-1 flex-row items-center gap-1.5">
            <Text className="text-xs text-green-100">{t("expected")}</Text>
            <Text className="text-xs font-semibold text-white">{expected}</Text>
          </View>
          <View className="flex-1 flex-row items-center gap-1.5">
            <Text className="text-xs text-green-100">{t("actual")}</Text>
            <Text className="text-xs font-semibold text-white">{actual}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
