import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function SyncedLocationsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: "#fff",
        headerStyle: { backgroundColor: "#0d542b" },
      }}
    >
      <Stack.Screen name={"regions"} options={{ title: t("regions") }} />
      <Stack.Screen name={"districts"} options={{ title: t("districts") }} />
      <Stack.Screen name={"wards"} options={{ title: t("wards") }} />
      <Stack.Screen name={"villages"} options={{ title: t("villages") }} />
    </Stack>
  );
}
