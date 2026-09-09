import type { HouseholdMember } from "@/src/utils/household-member";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Stack, useLocalSearchParams } from "expo-router";
import { FingerprintPattern, ScanFace, ShieldCheck, ShieldX } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import {
  biometricEnrollmentBlocker,
  type BiometricEnrollmentBlocker,
} from "@/src/features/biometric-attendance/enrollment-availability";
import { getMemberBiometricCapabilities } from "@/src/features/biometric-attendance/provider";
import {
  enrollMemberBiometric,
  revokeMemberBiometric,
} from "@/src/features/biometric-attendance/service";
import {
  BIOMETRIC_CONSENT_VERSION,
  MemberBiometricError,
  type MemberBiometricCapabilities,
  type MemberBiometricMethod,
} from "@/src/features/biometric-attendance/types";
import { useIsOnline } from "@/src/hooks/use-is-online";
import { authenticateBiometric } from "@/src/lib/biometric-auth";
import {
  biometricEnrollmentsCollection,
  householdMembersCollection,
} from "@/src/powersync/collections";
import { useSession } from "@/src/providers/session-context";

function parseMember(value: string | undefined) {
  try {
    return value ? (JSON.parse(value) as HouseholdMember) : null;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof MemberBiometricError)) return t("biometric_enrolment_failed");

  switch (error.code) {
    case "provider_unavailable":
      return t("member_biometric_provider_unavailable");
    case "method_unavailable":
      return t("biometric_method_unavailable");
    case "offline_unavailable":
      return t("biometric_enrolment_offline_unavailable");
    case "consent_required":
      return t("biometric_consent_required");
    case "cancelled":
      return t("biometric_cancelled");
    default:
      return t("biometric_enrolment_failed");
  }
}

function blockerMessage(blocker: BiometricEnrollmentBlocker, t: (key: string) => string) {
  switch (blocker) {
    case "member_inactive":
      return t("member_biometric_member_inactive");
    case "provider_unavailable":
      return t("member_biometric_provider_unavailable");
    case "method_unavailable":
      return t("biometric_method_unavailable");
    case "offline_unavailable":
      return t("biometric_enrolment_offline_unavailable");
  }
}

export default function MemberBiometricsScreen() {
  const { t } = useTranslation();
  const {
    id,
    uuid,
    member: serializedMember,
  } = useLocalSearchParams<{
    id: string;
    uuid?: string;
    member?: string;
  }>();
  const { user } = useSession();
  const isOnline = useIsOnline();
  const isDark = useColorScheme() === "dark";
  const routeMember = useMemo(() => parseMember(serializedMember), [serializedMember]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [busyMethod, setBusyMethod] = useState<MemberBiometricMethod | null>(null);
  const [capabilities, setCapabilities] = useState<MemberBiometricCapabilities | null>(null);

  const { data: members = [], isLoading: isMemberLoading } = useLiveQuery(
    (q) =>
      q
        .from({ member: householdMembersCollection })
        .where(({ member }) => eq(member.uuid, id ?? routeMember?.uuid ?? ""))
        .orderBy(({ member }) => member.id, "asc")
        .limit(1),
    [id, routeMember?.uuid],
  );
  const currentMember = members[0] ?? routeMember ?? null;
  const memberId = String(currentMember?.uuid ?? currentMember?.id ?? "__missing_member__");

  const { data: activeEnrollments = [] } = useLiveQuery(
    (q) =>
      q
        .from({ enrollment: biometricEnrollmentsCollection })
        .where(({ enrollment }) => eq(enrollment.memberId, memberId))
        .where(({ enrollment }) => eq(enrollment.status, "active")),
    [memberId],
  );

  useEffect(() => {
    let cancelled = false;
    void getMemberBiometricCapabilities().then((next) => {
      if (!cancelled) setCapabilities(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFor = (method: MemberBiometricMethod) =>
    activeEnrollments.find((item) => item.method === method);

  const handleEnroll = async (method: MemberBiometricMethod) => {
    if (!currentMember || busyMethod) return;
    if (!consentGranted) {
      Alert.alert(t("consent_required"), t("biometric_consent_required"));
      return;
    }
    if (!capabilities) {
      Alert.alert(
        t("biometric_enrolment_unavailable_title"),
        t("member_biometric_provider_unavailable"),
      );
      return;
    }
    const blocker = biometricEnrollmentBlocker({
      memberActive: Boolean(currentMember.isActive),
      capabilities,
      method,
      isOnline,
    });
    if (blocker) {
      Alert.alert(t("biometric_enrolment_unavailable_title"), blockerMessage(blocker, t));
      return;
    }
    if (!user?.id) {
      Alert.alert(t("biometric_enrolment_unavailable_title"), t("authorization_required"));
      return;
    }

    setBusyMethod(method);
    try {
      await authenticateBiometric({
        promptMessage: t("authorize_biometric_enrolment"),
        promptSubtitle: user.fullName ?? undefined,
        promptDescription: t("staff_reauthentication_description"),
      });
      await enrollMemberBiometric({
        memberId,
        householdId: uuid ?? currentMember.householdUuid ?? null,
        method,
        authorizedByUserId: user.id,
        consentGranted,
        isOnline,
      });
      setConsentGranted(false);
      Alert.alert(t("saved"), t("biometric_enrolment_saved"));
    } catch (error) {
      Alert.alert(t("biometric_enrolment_failed_title"), errorMessage(error, t));
    } finally {
      setBusyMethod(null);
    }
  };

  const confirmRevoke = (method: MemberBiometricMethod) => {
    const enrollment = activeFor(method);
    if (!enrollment || !user?.id) return;

    Alert.alert(t("withdraw_biometric_consent"), t("withdraw_biometric_consent_description"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("withdraw"),
        style: "destructive",
        onPress: () => {
          void authenticateBiometric({
            promptMessage: t("authorize_biometric_withdrawal"),
            promptSubtitle: user.fullName ?? undefined,
            promptDescription: t("staff_reauthentication_description"),
          })
            .then(() =>
              revokeMemberBiometric({
                enrollmentId: enrollment.id,
                memberId,
                authorizedByUserId: user.id,
              }),
            )
            .catch((error) => Alert.alert(t("error"), errorMessage(error, t)));
        },
      },
    ]);
  };

  if (isMemberLoading || !capabilities) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator />
      </View>
    );
  }

  if (!currentMember) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-950">
        <Text className="text-base text-red-600 dark:text-red-400">
          {t("member_data_not_found")}
        </Text>
      </View>
    );
  }

  const renderMethod = (method: MemberBiometricMethod) => {
    const enrollment = activeFor(method);
    const blocker = biometricEnrollmentBlocker({
      memberActive: Boolean(currentMember.isActive),
      capabilities,
      method,
      isOnline,
    });
    const available = blocker === null;
    const Icon = method === "fingerprint" ? FingerprintPattern : ScanFace;
    const label = method === "fingerprint" ? t("fingerprint") : t("face");

    return (
      <View
        key={method}
        className="gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <Icon size={22} color={isDark ? "#d1d5db" : "#374151"} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">{label}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {enrollment
                ? t("biometric_enrolled_on", {
                    date: new Date(enrollment.enrolledAt ?? "").toLocaleDateString(),
                  })
                : available
                  ? t("biometric_ready_to_enrol")
                  : t("biometric_method_unavailable")}
            </Text>
          </View>
          {enrollment ? (
            <ShieldCheck size={20} color="#16a34a" />
          ) : (
            <ShieldX size={20} color="#9ca3af" />
          )}
        </View>

        <View className="flex-row gap-2">
          <Pressable
            disabled={busyMethod !== null || !consentGranted}
            onPress={() => handleEnroll(method)}
            accessibilityHint={blocker ? blockerMessage(blocker, t) : undefined}
            className={`flex-1 items-center rounded-full bg-emerald-800 px-4 py-2.5 ${
              busyMethod !== null || !consentGranted ? "opacity-40" : ""
            }`}
          >
            <Text className="font-semibold text-white">
              {busyMethod === method
                ? t("processing")
                : enrollment
                  ? t("update_biometric")
                  : t("enrol_biometric")}
            </Text>
          </Pressable>
          {enrollment && (
            <Pressable
              disabled={busyMethod !== null}
              onPress={() => confirmRevoke(method)}
              className="items-center rounded-full bg-red-50 px-4 py-2.5 dark:bg-red-950/40"
            >
              <Text className="font-semibold text-red-700 dark:text-red-300">{t("withdraw")}</Text>
            </Pressable>
          )}
        </View>
        {blocker && (
          <Text className="text-sm text-amber-700 dark:text-amber-300">
            {blockerMessage(blocker, t)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: t("member_biometrics") }} />
      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        <View>
          <Text className="text-xl font-bold text-gray-950 dark:text-gray-50">
            {currentMember.fullName}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t("biometric_enrolment_authorized_process")}
          </Text>
        </View>

        <View className="gap-2 rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/40">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={18} color={isDark ? "#93c5fd" : "#1d4ed8"} />
            <Text className="font-semibold text-blue-900 dark:text-blue-100">
              {t("biometric_privacy_title")}
            </Text>
          </View>
          <Text className="text-sm leading-5 text-blue-800 dark:text-blue-200">
            {t("biometric_privacy_description")}
          </Text>
          <Text className="text-xs text-blue-700 dark:text-blue-300">
            {t("consent_version", { version: BIOMETRIC_CONSENT_VERSION })}
          </Text>
        </View>

        <Pressable
          onPress={() => setConsentGranted((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentGranted }}
          className="flex-row items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <View
            className={`mt-0.5 size-5 items-center justify-center rounded border ${
              consentGranted
                ? "border-emerald-700 bg-emerald-700"
                : "border-gray-400 bg-transparent"
            }`}
          >
            {consentGranted && <Text className="text-xs font-bold text-white">✓</Text>}
          </View>
          <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
            {t("biometric_consent_confirmation")}
          </Text>
        </Pressable>

        {!capabilities.configured && (
          <View className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40">
            <Text className="font-semibold text-amber-900 dark:text-amber-100">
              {t("member_biometric_provider_unavailable_title")}
            </Text>
            <Text className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              {t("member_biometric_provider_unavailable")}
            </Text>
          </View>
        )}

        {renderMethod("fingerprint")}
        {renderMethod("face")}
      </ScrollView>
    </>
  );
}
