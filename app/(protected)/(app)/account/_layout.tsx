import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function GrievanceLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: "#fff",
        headerStyle: { backgroundColor: "#0d542b" },
      }}
    >
      <Stack.Screen name={"index"} options={{ headerShown: true, title: t("account") }} />
      <Stack.Screen name={"location"} options={{ headerShown: false, title: t("locations") }} />
      <Stack.Screen
        name={"synced-locations"}
        options={{ headerShown: false, title: t("synced_locations") }}
      />
      <Stack.Screen
        name={"synced-grievance-setup"}
        options={{ headerShown: false, title: t("synced_grievance_setup") }}
      />
    </Stack>
  );
}
