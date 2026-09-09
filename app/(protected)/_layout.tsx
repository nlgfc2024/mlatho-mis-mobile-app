import { Stack } from "expo-router";

import { useStartup } from "@/src/startup/startup-context";

export default function ProtectedLayout() {
  const { destination } = useStartup();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={destination === "setup"}>
        <Stack.Screen name="(sync)" />
      </Stack.Protected>

      <Stack.Protected guard={destination === "dashboard"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
