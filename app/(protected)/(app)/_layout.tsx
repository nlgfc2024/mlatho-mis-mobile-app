import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

export default function ProtectedLayout() {
  const { t } = useTranslation();

  return (
    <View className="flex-1">
      {/* <PowerSyncStatusBanner /> */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name={"dashboard"} />
        <Stack.Screen name={"grievance"} />
        <Stack.Screen name={"targeted-members"} />
        <Stack.Screen name={"quick-info"} />
        <Stack.Screen name={"account"} />
        <Stack.Screen name={"training"} />
        <Stack.Screen name={"communication"} />
        <Stack.Screen name={"coordination"} />
        <Stack.Screen name={"notifications"} />
        <Stack.Screen
          name={"customize-tiles"}
          options={{
            headerShown: true,
            title: t("customize_tiles"),
            headerTintColor: "#fff",
            headerStyle: { backgroundColor: "#0d542b" },
          }}
        />
      </Stack>
    </View>
  );
}
