import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function TrainingLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name={"index"}
        options={{
          title: t("training"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"all"}
        options={{
          title: t("all_trainings"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"[id]"}
        options={{
          title: t("training_details"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
    </Stack>
  );
}
