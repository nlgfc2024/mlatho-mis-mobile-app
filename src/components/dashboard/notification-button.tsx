import { Link } from "expo-router";
import { Bell } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, useColorScheme, View } from "react-native";

import { usePreferences } from "@/src/providers/preference-context";

export default function DashboardNotificationButton({ onGreen = false }: { onGreen?: boolean }) {
  const { t } = useTranslation();
  const { notifications } = usePreferences();
  const isDark = useColorScheme() === "dark";

  const iconColor = onGreen
    ? "#dcfce7"
    : notifications
      ? isDark
        ? "#86efac"
        : "#0d542b"
      : isDark
        ? "#9ca3af"
        : "#6a7282";

  return (
    <Link href="/notifications" asChild push>
      <Pressable
        accessibilityLabel={t("notifications")}
        accessibilityRole="button"
        className={
          onGreen
            ? "relative flex size-10 items-center justify-center rounded-full border border-[#0d542b] bg-[#0d542b]"
            : "relative flex size-10 items-center justify-center overflow-hidden rounded-full border border-white bg-white dark:border-gray-950 dark:bg-gray-950"
        }
      >
        <Bell size={20} color={iconColor} />
        <View
          className={
            onGreen
              ? "absolute top-1.5 right-1.5 size-2.5 rounded-full border border-[#0d542b] bg-red-600"
              : "absolute top-1.5 right-1.5 size-2.5 rounded-full border border-white bg-red-600 dark:border-gray-900"
          }
        />
      </Pressable>
    </Link>
  );
}
