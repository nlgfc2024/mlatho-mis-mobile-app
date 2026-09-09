import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";

import { usePreferences } from "@/src/providers/preference-context";

export default function NotificationsLayout() {
  const { t } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { theme } = usePreferences();
  const isDark = theme === "dark" || (theme === "system" && systemColorScheme === "dark");
  const screenBackground = isDark ? "#030712" : "#ffffff";

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: t("notices"),
          headerTintColor: isDark ? "#f9fafb" : "#030712",
          headerStyle: { backgroundColor: screenBackground },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
