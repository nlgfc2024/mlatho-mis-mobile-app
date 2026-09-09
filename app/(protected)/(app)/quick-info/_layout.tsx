import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function GrievanceLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name={"index"}
        options={{
          headerShown: true,
          title: t("quick_information"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
    </Stack>
  );
}
