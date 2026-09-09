import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function CommunitySessionLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name={"index"}
        options={{
          title: t("community_session"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />

      <Stack.Screen
        name={"create"}
        options={{
          title: t("attendance"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />

      <Stack.Screen
        name={"[id]"}
        options={{
          title: t("community_session"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
    </Stack>
  );
}
