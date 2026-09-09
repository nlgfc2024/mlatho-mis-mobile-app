// import { ExperimentalStack as Stack } from "expo-router";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function GrievanceLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name={"index"}
        options={{
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      >
        <Stack.Screen.Title>{t("grievance")}</Stack.Screen.Title>
      </Stack.Screen>

      <Stack.Screen
        name={"[id]"}
        options={{ headerTintColor: "#fff", headerStyle: { backgroundColor: "#0d542b" } }}
      >
        <Stack.Screen.Title>{t("grievance")}</Stack.Screen.Title>
      </Stack.Screen>

      <Stack.Screen
        name={"create"}
        options={{ headerTintColor: "#fff", headerStyle: { backgroundColor: "#0d542b" } }}
      >
        <Stack.Screen.Title>{t("grievance")}</Stack.Screen.Title>
      </Stack.Screen>
    </Stack>
  );
}
