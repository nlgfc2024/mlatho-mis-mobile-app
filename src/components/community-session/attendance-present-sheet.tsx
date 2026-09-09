import { eq, useLiveQuery } from "@tanstack/react-db";
import { clsx } from "clsx";
import { FingerprintPattern, ScanFace, ShieldCheck, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMemberBiometricCapabilities } from "@/src/features/biometric-attendance/provider";
import { verifyMemberForAttendance } from "@/src/features/biometric-attendance/service";
import {
  MemberBiometricError,
  type AttendanceAttendee,
  type AttendanceVerificationProof,
  type MemberBiometricCapabilities,
  type MemberBiometricMethod,
} from "@/src/features/biometric-attendance/types";
import { useIsOnline } from "@/src/hooks/use-is-online";
import { biometricEnrollmentsCollection } from "@/src/powersync/collections";

type ComponentProps = {
  attendee: AttendanceAttendee | null;
  isOpen: boolean;
  onDismiss: () => void;
  onConfirm: (proof: AttendanceVerificationProof) => void;
};

type AttendanceActionProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
};

const AttendanceAction = ({
  icon,
  title,
  description,
  onPress,
  disabled,
}: AttendanceActionProps) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ disabled: Boolean(disabled) }}
    className={clsx(
      "flex-row items-center gap-4 rounded-xl border border-gray-100 bg-white px-3 py-4 active:bg-pressed-strong dark:border-gray-800 dark:bg-gray-900",
      { "opacity-45": disabled },
    )}
  >
    <View className="size-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
      {icon}
    </View>
    <View className="min-w-0 flex-1">
      <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">{title}</Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400">{description}</Text>
    </View>
  </Pressable>
);

function biometricErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof MemberBiometricError)) return t("could_not_verify_biometric_attendance");

  switch (error.code) {
    case "provider_unavailable":
      return t("member_biometric_provider_unavailable");
    case "not_enrolled":
      return t("member_biometric_not_enrolled");
    case "method_unavailable":
      return t("biometric_method_unavailable");
    case "offline_unavailable":
      return t("biometric_offline_unavailable");
    case "identity_mismatch":
      return t("member_biometric_identity_mismatch");
    case "cancelled":
      return t("biometric_cancelled");
    default:
      return t("could_not_verify_biometric_attendance");
  }
}

const AttendancePresentSheet = ({ attendee, isOpen, onDismiss, onConfirm }: ComponentProps) => {
  const { t } = useTranslation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [capabilities, setCapabilities] = useState<MemberBiometricCapabilities | null>(null);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isOnline = useIsOnline();
  const memberId = attendee?.memberId ?? "__missing_member__";

  const { data: enrollments = [] } = useLiveQuery(
    (q) =>
      q
        .from({ enrollment: biometricEnrollmentsCollection })
        .where(({ enrollment }) => eq(enrollment.memberId, memberId))
        .where(({ enrollment }) => eq(enrollment.status, "active")),
    [memberId],
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    void getMemberBiometricCapabilities().then((next) => {
      if (!cancelled) setCapabilities(next);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const enrolledMethods = useMemo(
    () => new Set(enrollments.map((enrollment) => enrollment.method)),
    [enrollments],
  );

  const methodDescription = (method: MemberBiometricMethod) => {
    if (!attendee?.memberId) return t("attendance_member_record_required");
    if (!enrolledMethods.has(method)) return t("member_biometric_method_not_enrolled");
    if (!capabilities?.configured) return t("member_biometric_provider_unavailable");

    const capability = capabilities.methods.find((item) => item.method === method);
    if (!capability?.available) return t("biometric_method_unavailable");
    if (!isOnline && !capability.canVerifyOffline) return t("biometric_offline_unavailable");
    return method === "fingerprint" ? t("verify_with_fingerprint") : t("verify_with_face");
  };

  const methodEnabled = (method: MemberBiometricMethod) => {
    const capability = capabilities?.methods.find((item) => item.method === method);
    return Boolean(
      attendee?.memberId &&
      enrolledMethods.has(method) &&
      capabilities?.configured &&
      capability?.available &&
      (isOnline || capability.canVerifyOffline),
    );
  };

  const handleBiometricPresent = async (method: MemberBiometricMethod) => {
    if (!attendee?.memberId || isAuthenticating || !methodEnabled(method)) return;

    setIsAuthenticating(true);
    try {
      const proof = await verifyMemberForAttendance({
        memberId: attendee.memberId,
        method,
        isOnline,
      });

      // Defense in depth: the service and provider both enforce this binding,
      // and the form persists only proofs for the currently selected member.
      if (proof.memberId !== attendee.memberId) {
        throw new MemberBiometricError(
          "identity_mismatch",
          "The verification proof belongs to a different member.",
        );
      }

      onConfirm(proof);
      onDismiss();
    } catch (error) {
      if (error instanceof MemberBiometricError && error.code === "cancelled") return;
      Alert.alert(t("verification_failed"), biometricErrorMessage(error, t));
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isOpen || !attendee) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onDismiss} />

        <View
          className="rounded-t-3xl bg-white px-4 pt-3 dark:bg-gray-900"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <View className="items-center pb-3">
            <View className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
          </View>

          <View className="mb-4 flex-row items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-bold text-gray-950 dark:text-gray-50">
                {t("mark_attendee_present", {
                  name: attendee.memberName ?? attendee.headName ?? t("attendee"),
                })}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">{attendee.groupCode}</Text>
            </View>

            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t("cancel")}
              className="size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <X size={18} color={isDark ? "#9ca3af" : "#4b5563"} />
            </Pressable>
          </View>

          <View className="mb-3 flex-row gap-2 rounded-xl bg-blue-50 p-3 dark:bg-blue-950/40">
            <ShieldCheck size={18} color={isDark ? "#93c5fd" : "#1d4ed8"} />
            <Text className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              {t("member_bound_biometric_notice")}
            </Text>
          </View>

          {!capabilities && (
            <View className="items-center py-4">
              <ActivityIndicator />
            </View>
          )}

          {capabilities && (
            <View className="gap-2">
              <AttendanceAction
                disabled={isAuthenticating || !methodEnabled("fingerprint")}
                icon={<FingerprintPattern size={22} color={isDark ? "#4ade80" : "#166534"} />}
                title={t("scan_fingerprint")}
                description={methodDescription("fingerprint")}
                onPress={() => handleBiometricPresent("fingerprint")}
              />
              <AttendanceAction
                disabled={isAuthenticating || !methodEnabled("face")}
                icon={<ScanFace size={22} color={isDark ? "#60a5fa" : "#1d4ed8"} />}
                title={t("scan_face")}
                description={methodDescription("face")}
                onPress={() => handleBiometricPresent("face")}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default AttendancePresentSheet;
