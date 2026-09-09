import { useNetInfo } from "@react-native-community/netinfo";

/**
 * Whether the device currently has a usable internet connection.
 *
 * Mirrors the app-wide convention (see `onlineManager` wiring in
 * `app/_layout.tsx`): only a definitive `false` counts as offline —
 * `null` means "not yet known" and is treated as online so the UI does
 * not flash an offline state on startup.
 */
export function useIsOnline() {
  const netInfo = useNetInfo();

  return netInfo.isConnected !== false && netInfo.isInternetReachable !== false;
}
