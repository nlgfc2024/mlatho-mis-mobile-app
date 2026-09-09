import type { AttendanceSessionRecord } from "@/src/powersync/schema";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import ProgressRing from "@/src/components/ui/progress-ring";
import { getDateLocale } from "@/src/i18n/helpers";

const QUARTER_COLOR: Record<string, string> = {
  Q1: "#3b82f6", // blue-500
  Q2: "#16a34a", // green-600
  Q3: "#d97706", // amber-600
  Q4: "#dc2626", // red-600
};

interface ComponentProps {
  attendance: Partial<AttendanceSessionRecord> & {
    id: string;
    attendances?: { status?: string | null }[];
  };
}

const CommunitySessionAttendanceListItem: React.FC<ComponentProps> = ({ attendance }) => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const rowSeparatorStyle = useRowSeparatorStyle("top");
  const attendances = attendance.attendances ?? [];

  const presentCount = attendances.reduce(
    (count, a) => (a.status === "present" ? count + 1 : count),
    0,
  );
  const total = attendances.length;
  const progress = total > 0 ? presentCount / total : 0;
  const progressPercentage = Math.round(progress * 100);
  const progressColor = progress < 0.4 ? "#dc2626" : progress < 0.75 ? "#d97706" : "#16a34a";

  const sessionDate = attendance.date ? new Date(attendance.date) : null;

  const formattedDate = sessionDate
    ? sessionDate.toLocaleDateString(getDateLocale(i18n.language), {
        weekday: "short",
        month: "short",
        day: "2-digit",
      })
    : "—";

  const quarter = attendance.type;
  const color = quarter ? (QUARTER_COLOR[quarter] ?? "#4b5563") : "#4b5563";

  return (
    <Link
      href={{
        pathname: "/(protected)/(app)/community-session/[id]",
        params: { id: attendance.id },
      }}
      asChild
    >
      <Pressable
        style={rowSeparatorStyle}
        className="flex-row items-center justify-between gap-4 px-4 py-3 focus:bg-pressed active:bg-pressed"
      >
        {/* Dot + text stack */}
        <View className="flex-1 gap-1">
          {/* Quarter row — dot + label */}
          <View className="flex-row items-center gap-1.5">
            <View className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
            <Text className="text-sm font-medium" style={{ color }}>
              {quarter ?? "—"}
            </Text>
          </View>

          {/* Title + date */}
          <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
            {t("community_session")}
          </Text>
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

export default CommunitySessionAttendanceListItem;
