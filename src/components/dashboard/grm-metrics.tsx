import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

// Mock GRM figures. TODO: replace with live counts scoped to the user's area.
type StatusId = "new" | "assigned" | "overdue" | "resolved";

type GrmStatus = {
  id: StatusId;
  labelKey: string;
  color: string;
};

const STATUSES: GrmStatus[] = [
  { id: "new", labelKey: "status_new", color: "#3b82f6" },
  { id: "assigned", labelKey: "status_assigned", color: "#f59e0b" },
  { id: "overdue", labelKey: "status_overdue", color: "#ef4444" },
  { id: "resolved", labelKey: "status_resolved", color: "#16a34a" },
];

// Six months of grievances, each row aligned to STATUSES order
// ([new, assigned, overdue, resolved]); the last row is the current month.
const MONTHLY_VALUES: number[][] = [
  [5, 9, 2, 22],
  [7, 11, 4, 28],
  [6, 10, 2, 31],
  [9, 13, 5, 35],
  [8, 12, 3, 38],
  [8, 14, 3, 41],
];

const CURRENT = MONTHLY_VALUES[MONTHLY_VALUES.length - 1];
const TOTAL = CURRENT.reduce((sum, value) => sum + value, 0);
const MAX_VALUE = Math.max(...MONTHLY_VALUES.flat());
const BAR_MAX = 110;
const CHART_HEIGHT = 150;

export default function GrmMetrics() {
  const { t, i18n } = useTranslation();

  const monthLabels = useMemo(() => {
    const now = new Date();
    return MONTHLY_VALUES.map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (MONTHLY_VALUES.length - 1 - index), 1);
      return date.toLocaleString(i18n.language, { month: "short" });
    });
  }, [i18n.language]);

  return (
    <View className="gap-2">
      {/* ── Total ── */}
      <View className="gap-1">
        <Text className="text-xs text-gray-500 dark:text-gray-400">{t("total_grievances")}</Text>
        <Text className="text-4xl font-bold text-gray-950 dark:text-gray-50">{TOTAL}</Text>
      </View>

      {/* ── Grouped comparison chart (last 6 months) ── */}
      <View className="gap-3">
        <View
          className="flex-row items-end justify-between gap-2"
          style={{ height: CHART_HEIGHT }}
        >
          {MONTHLY_VALUES.map((values, monthIndex) => (
            <View key={monthIndex} className="flex-1 items-center justify-end gap-1.5">
              <View className="flex-row items-end gap-0.5">
                {STATUSES.map((status, statusIndex) => (
                  <View
                    key={status.id}
                    className="w-2.5 rounded-t-[3px]"
                    style={{
                      height: Math.max(4, (values[statusIndex] / MAX_VALUE) * BAR_MAX),
                      backgroundColor: status.color,
                    }}
                  />
                ))}
              </View>

              <Text className="text-[11px] text-gray-500 dark:text-gray-400" numberOfLines={1}>
                {monthLabels[monthIndex]}
              </Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View className="flex-row flex-wrap justify-start gap-x-4 gap-y-1.5">
          {STATUSES.map((status) => (
            <View key={status.id} className="flex-row items-center gap-1.5">
              <View className="size-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              <Text className="text-[11px] text-gray-500 dark:text-gray-400">
                {t(status.labelKey)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
