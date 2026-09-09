import { useTranslation } from "react-i18next";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";

import { type DashboardStat } from "./dashboard-groups";

const SCREEN_PADDING = 32;
const CARD_GAP = 12;
const VISIBLE_COLUMNS = 3;

function StatTile({ stat, width }: { stat: DashboardStat; width: number }) {
  const { t } = useTranslation();

  return (
    <View
      style={{ width }}
      className="h-24 justify-center gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <Text className="text-xl font-bold text-gray-950 dark:text-gray-50">{stat.value}</Text>
      <Text className="text-xs leading-4 text-gray-500 dark:text-gray-400" numberOfLines={2}>
        {t(stat.labelKey)}
      </Text>
    </View>
  );
}

export default function DashboardStatsRow({ stats }: { stats: DashboardStat[] }) {
  const { width } = useWindowDimensions();
  const cardWidth =
    (width - SCREEN_PADDING - CARD_GAP * (VISIBLE_COLUMNS - 1)) / VISIBLE_COLUMNS;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3"
    >
      {stats.map((stat) => (
        <StatTile key={stat.id} stat={stat} width={cardWidth} />
      ))}
    </ScrollView>
  );
}
