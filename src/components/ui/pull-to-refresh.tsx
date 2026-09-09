import { cloneElement, type ComponentProps, type ReactElement } from "react";
import { RefreshControl, useColorScheme, type ScrollView } from "react-native";

/**
 * Pull-to-refresh around a ScrollView, injected as a themed `RefreshControl`.
 *
 * Note: Compose's `PullToRefreshBox` (with the Material 3 expressive
 * indicator) cannot be used here — it detects the pull through Compose's
 * nested-scroll system, which React Native ScrollViews hosted via
 * `RNHostView` never feed into, so the gesture simply doesn't fire. The M3
 * `LoadingIndicator` still appears in the sync status toast while the
 * triggered refresh runs.
 */
export function PullToRefresh({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactElement<ComponentProps<typeof ScrollView>>;
}) {
  const isDark = useColorScheme() === "dark";
  const accentColor = isDark ? "#4ade80" : "#0d542b";

  return cloneElement(children, {
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={accentColor}
        colors={[accentColor]}
        progressBackgroundColor={isDark ? "#1f2937" : "#ffffff"}
      />
    ),
  });
}
