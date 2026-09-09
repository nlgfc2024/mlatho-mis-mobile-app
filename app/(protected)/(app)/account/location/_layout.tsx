import { Stack } from "expo-router";

export default function AccountLocationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: "#fff",
        headerStyle: { backgroundColor: "#0d542b" },
      }}
    >
      <Stack.Screen name={"index"} options={{ title: "Location", headerShown: true }} />
      <Stack.Screen name={"create"} options={{ title: "Create location", headerShown: true }} />
      <Stack.Screen name={"households"} options={{ title: "Households", headerShown: true }} />
      <Stack.Screen name={"[id]"} options={{ headerShown: true }} />
    </Stack>
  );
}
