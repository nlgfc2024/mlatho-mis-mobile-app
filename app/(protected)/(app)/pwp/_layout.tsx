import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function PwpLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: t("pwp"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t("pwp_create_attendance"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t("pwp_session"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
    </Stack>
  );
}
