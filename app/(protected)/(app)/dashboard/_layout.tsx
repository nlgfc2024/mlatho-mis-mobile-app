import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name={"index"}>
        <Stack.Header hidden />
      </Stack.Screen>
    </Stack>
  );
}
