import { Host, LoadingIndicator } from "@expo/ui/jetpack-compose";
import { useStore } from "@tanstack/react-store";
import { AlertTriangle, Check, CloudOff, RotateCw, X } from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Platform, Pressable, Text, useColorScheme, View } from "react-native";
import Animated, {
  Easing,
  FadeOutDown,
  LinearTransition,
  ReduceMotion,
  SlideInDown,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsOnline } from "@/src/hooks/use-is-online";
import { cleanErrorMessage } from "@/src/lib/clean-error-message";
import { resetSyncSession, syncProgressStore } from "@/src/sync/sync-progress";
import { runSyncLogicInternal } from "@/src/tasks/background-upload-task-definition";

const SUCCESS_DISMISS_MS = 2800;

type ToastState = "syncing" | "resuming" | "paused" | "success" | "failure" | "offline";

/**
 * Single floating status toast for everything sync: live progress, terminal
 * success/failure (with retry), and the offline indicator. Follows the
 * Material 3 snackbar recipe — inverse surface, one optional action, bottom
 * placement — with springy state transitions kept subtle via ReduceMotion.
 */
export function SyncStatusToast() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isOnline = useIsOnline();
  const { session, steps } = useStore(syncProgressStore, (state) => ({
    session: state.session,
    steps: state.steps,
  }));

  const state: ToastState | null =
    session === "paused_offline" || session === "waiting_to_resume"
      ? "paused"
      : session === "failed"
        ? "failure"
        : (session === "running" || session === "resuming") && steps.length > 0
          ? session === "resuming"
            ? "resuming"
            : "syncing"
          : session === "succeeded"
            ? "success"
            : !isOnline
              ? "offline"
              : null;

  // Success celebrates briefly, then gets out of the way.
  useEffect(() => {
    if (state !== "success") return;

    const timer = setTimeout(() => {
      if (syncProgressStore.state.session === "succeeded") resetSyncSession();
    }, SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (!state) return null;

  const completed = steps.filter((step) => step.state === "success").length;
  const runningStep = steps.find((step) => step.state === "running");
  const failedStep = steps.find((step) => step.state === "failed");

  // Inverse-surface palette: dark toast on light theme, light toast on dark.
  const onSurfaceMuted = isDark ? "#4b5563" : "rgba(249, 250, 251, 0.7)";
  const successColor = isDark ? "#15803d" : "#4ade80";
  const failureColor = isDark ? "#b91c1c" : "#f87171";
  const actionColor = isDark ? "#166534" : "#86efac";

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ bottom: insets.bottom + 16 }}
    >
      <Animated.View
        key={state}
        entering={SlideInDown.duration(280)
          .easing(Easing.out(Easing.cubic))
          .reduceMotion(ReduceMotion.System)}
        exiting={FadeOutDown.duration(180)
          .easing(Easing.in(Easing.cubic))
          .reduceMotion(ReduceMotion.System)}
        layout={LinearTransition.duration(220)
          .easing(Easing.inOut(Easing.cubic))
          .reduceMotion(ReduceMotion.System)}
        pointerEvents={state === "offline" || state === "paused" ? "none" : "auto"}
        accessibilityLiveRegion="polite"
        accessibilityRole={state === "failure" ? "alert" : undefined}
        className="self-center overflow-hidden rounded-full bg-gray-900 shadow-lg dark:bg-gray-100"
        style={{ width: "92%", maxWidth: 480 }}
      >
        <View className="flex-row items-center gap-3 p-3">
          <ToastIcon
            state={state}
            successColor={successColor}
            failureColor={failureColor}
            mutedColor={onSurfaceMuted}
          />

          <View className="flex-1 py-0.5">
            <Text
              className="text-sm font-semibold text-gray-50 dark:text-gray-900"
              numberOfLines={1}
            >
              {state === "syncing"
                ? t("syncing")
                : state === "resuming"
                  ? t("sync_resuming")
                  : state === "paused"
                    ? t("sync_paused_no_internet")
                    : state === "success"
                      ? t("sync_complete")
                      : state === "failure"
                        ? t("sync_failed")
                        : t("you_are_offline")}
            </Text>

            {(state === "syncing" || state === "resuming") && runningStep ? (
              <Text className="mt-0.5 text-xs" style={{ color: onSurfaceMuted }} numberOfLines={1}>
                {runningStep.label} · {completed + 1}/{steps.length}
              </Text>
            ) : null}

            {state === "paused" ? (
              <Text className="mt-0.5 text-xs" style={{ color: onSurfaceMuted }} numberOfLines={1}>
                {t("sync_waiting_to_resume")}
              </Text>
            ) : null}

            {state === "failure" && (cleanErrorMessage(failedStep?.error) ?? failedStep?.label) ? (
              <Text className="mt-0.5 text-xs" style={{ color: onSurfaceMuted }} numberOfLines={2}>
                {cleanErrorMessage(failedStep?.error) ?? failedStep?.label}
              </Text>
            ) : null}
          </View>

          {state === "failure" ? (
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("retry")}
                onPress={() => {
                  resetSyncSession();
                  void runSyncLogicInternal("Manual Retry");
                }}
                hitSlop={8}
                className="min-h-11 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-60"
              >
                <RotateCw size={14} color={actionColor} strokeWidth={2.5} />
                <Text className="text-sm font-semibold" style={{ color: actionColor }}>
                  {t("retry")}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("dismiss")}
                onPress={() => resetSyncSession()}
                hitSlop={8}
                className="min-h-11 items-center justify-center rounded-full px-2 active:opacity-60"
              >
                <X size={16} color={onSurfaceMuted} strokeWidth={2.25} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

function ToastIcon({
  state,
  successColor,
  failureColor,
  mutedColor,
}: {
  state: ToastState;
  successColor: string;
  failureColor: string;
  mutedColor: string;
}) {
  if (state === "syncing" || state === "resuming") {
    return (
      <View className="size-7 items-center justify-center">
        {Platform.OS === "android" ? (
          <Host style={{ width: 28, height: 28 }}>
            <LoadingIndicator color={successColor} />
          </Host>
        ) : (
          <ActivityIndicator size="small" color={successColor} />
        )}
      </View>
    );
  }

  if (state === "success") {
    return (
      <Animated.View
        entering={ZoomIn.duration(240)
          .easing(Easing.out(Easing.back(1.3)))
          .reduceMotion(ReduceMotion.System)}
        className="size-7 items-center justify-center rounded-full bg-green-400/20 dark:bg-green-700/15"
      >
        <Check size={16} color={successColor} strokeWidth={3} />
      </Animated.View>
    );
  }

  if (state === "failure") {
    return (
      <View className="size-7 items-center justify-center rounded-full bg-red-400/20 dark:bg-red-700/10">
        <AlertTriangle size={15} color={failureColor} strokeWidth={2.5} />
      </View>
    );
  }

  return (
    <View className="size-7 items-center justify-center">
      <CloudOff size={16} color={mutedColor} strokeWidth={2.25} />
    </View>
  );
}
