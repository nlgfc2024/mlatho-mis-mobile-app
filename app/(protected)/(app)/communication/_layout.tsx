import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function CommunicationLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name={"index"}
        options={{
          title: t("published_communications"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"[id]"}
        options={{
          title: t("communication"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
    </Stack>
  );
}
