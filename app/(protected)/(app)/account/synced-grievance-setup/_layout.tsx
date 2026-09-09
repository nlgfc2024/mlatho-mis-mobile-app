import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function SyncedGrievanceSetupLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: "#fff",
        headerStyle: { backgroundColor: "#0d542b" },
      }}
    >
      <Stack.Screen name={"categories"} options={{ title: t("grievance_categories") }} />
      <Stack.Screen name={"types"} options={{ title: t("grievance_types") }} />
      <Stack.Screen name={"channels"} options={{ title: t("grievance_channels") }} />
    </Stack>
  );
}
