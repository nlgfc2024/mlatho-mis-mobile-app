import type { PwpSessionRecord } from "@/src/powersync/schema";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import ProgressRing from "@/src/components/ui/progress-ring";
import { getDateLocale } from "@/src/i18n/helpers";

interface ComponentProps {
  session: Partial<PwpSessionRecord> & {
    id: string;
    attendances?: { status?: string | null }[];
  };
}

const PwpAttendanceListItem: React.FC<ComponentProps> = ({ session }) => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const rowSeparatorStyle = useRowSeparatorStyle("top");
  const attendances = session.attendances ?? [];

  const presentCount = attendances.reduce(
    (count, a) => (a.status === "present" ? count + 1 : count),
    0,
  );
  const total = attendances.length;
  const progress = total > 0 ? presentCount / total : 0;
  const progressPercentage = Math.round(progress * 100);
  const progressColor = progress < 0.4 ? "#dc2626" : progress < 0.75 ? "#d97706" : "#16a34a";

  const sessionDate = session.date ? new Date(session.date) : null;

  const dayName = sessionDate
    ? sessionDate.toLocaleDateString(getDateLocale(i18n.language), { weekday: "long" })
    : "—";

  const formattedDate = sessionDate
    ? sessionDate.toLocaleDateString(getDateLocale(i18n.language), {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

  const isToday = sessionDate ? sessionDate.toDateString() === new Date().toDateString() : false;

  return (
    <Link
      href={{
        pathname: "/(protected)/(app)/pwp/[id]",
        params: { id: session.id },
      }}
      asChild
    >
      <Pressable
        style={rowSeparatorStyle}
        className="flex-row items-center justify-between gap-4 px-4 py-3 focus:bg-pressed active:bg-pressed"
      >
        {/* Date block */}
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">{dayName}</Text>
            {isToday && (
              <View className="rounded bg-blue-100 px-1.5 py-0.5 dark:bg-blue-950">
                <Text className="text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                  {t("today")}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</Text>
        </View>

        {/* Attendance progress */}
        <ProgressRing
          progress={progressPercentage}
          size={40}
          strokeWidth={5}
          color={progressColor}
          trackColor={isDark ? "#374151" : "#e5e7eb"}
        >
          <Text
            className="text-[9px] font-semibold text-gray-950 dark:text-gray-50"
            numberOfLines={1}
          >
            {progressPercentage}%
          </Text>
        </ProgressRing>
      </Pressable>
    </Link>
  );
};

export default PwpAttendanceListItem;
