import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { CircleAlert, CloudOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
} from "react-native-reanimated";

import type { StartupErrorKind, StartupLoadingReason } from "./startup-state";

type StartupScreenProps = {
  errorKind?: StartupErrorKind;
  loadingReason?: StartupLoadingReason;
  onLayout?: (event: LayoutChangeEvent) => void;
  onRetry?: () => void;
};

function getLoadingMessageKey(reason: StartupLoadingReason | undefined) {
  if (reason === "session") return "startup_checking_session";
  if (reason === "network") return "startup_checking_connectivity";
  if (reason === "local-data") return "startup_checking_local_data";
  if (reason === "access-profile") return "startup_checking_access";
  if (reason === "dashboard") return "startup_selecting_dashboard";
  return "startup_preparing";
}

function getErrorMessageKey(kind: StartupErrorKind) {
  if (kind === "offline") return "startup_offline_access_unavailable";
  if (kind === "local-data") return "startup_local_data_error";
  if (kind === "permissions") return "startup_permissions_error";
  if (kind === "dashboard") return "startup_dashboard_error";
  return "startup_access_error";
}

export function StartupScreen({
  errorKind,
  loadingReason,
  onLayout,
  onRetry,
}: StartupScreenProps) {
  const { t } = useTranslation();
  const isOfflineError = errorKind === "offline";
  const ErrorIcon = isOfflineError ? CloudOff : CircleAlert;

  return (
    <View
      style={styles.screen}
      onLayout={onLayout}
      testID="startup-screen"
    >
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={{ width: 112, height: 112 }}
          contentFit="contain"
          accessibilityLabel={t("app_logo")}
        />

        {errorKind ? (
          <Animated.View
            entering={FadeIn.duration(180)
              .easing(Easing.out(Easing.cubic))
              .reduceMotion(ReduceMotion.System)}
            style={styles.errorContent}
          >
            <View style={styles.errorIcon}>
              <ErrorIcon size={24} color="#92400e" />
            </View>
            <View style={styles.messageGroup}>
              <Text selectable style={styles.title}>
                {t("startup_could_not_finish")}
              </Text>
              <Text selectable style={styles.message}>
                {t(getErrorMessageKey(errorKind))}
              </Text>
            </View>
            {onRetry ? (
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
              >
                <Text style={styles.retryLabel}>{t("retry")}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </View>

      {!errorKind ? (
        <Animated.View
          entering={FadeIn.duration(180)
            .delay(90)
            .easing(Easing.out(Easing.cubic))
            .reduceMotion(ReduceMotion.System)}
          style={styles.loadingContent}
        >
          <ActivityIndicator size="small" color="#0d542b" />
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {t(getLoadingMessageKey(loadingReason))}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: 32,
    maxWidth: 420,
    width: "100%",
  },
  errorContent: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  loadingContent: {
    alignItems: "center",
    bottom: 48,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    left: 24,
    position: "absolute",
    right: 24,
  },
  message: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  messageGroup: {
    alignItems: "center",
    gap: 8,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#0d542b",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 144,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  screen: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
