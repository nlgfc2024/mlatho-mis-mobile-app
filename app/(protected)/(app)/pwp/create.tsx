import type {
  AttendanceAttendee,
  AttendanceVerificationProof,
} from "@/src/features/biometric-attendance/types";
import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { useLiveQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import { Calendar } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ActivityIndicator, ScrollView, Text, useColorScheme, View } from "react-native";

import AttendancePresentSheet from "@/src/components/community-session/attendance-present-sheet";
import CommunitySessionAttendeeListItem from "@/src/components/community-session/community-session-attendee-list-item";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import {
  assertPresentAttendeeVerified,
  attendanceRemarks,
  buildAttendanceAttendees,
} from "@/src/features/biometric-attendance/attendance-proof";
import { useAppForm } from "@/src/form";
import { goBackOrReplace } from "@/src/lib/navigation";
import {
  householdMembersCollection,
  householdsCollection,
  pwpAttendanceCollection,
  pwpSessionsCollection,
} from "@/src/powersync/collections";
import { useSession } from "@/src/providers/session-context";

type FormValues = {
  date: Date;
  attendees: AttendanceAttendee[];
};

export default function PwpCreateScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const isDark = useColorScheme() === "dark";

  const today = new Date();
  const [presentAttendeeIndex, setPresentAttendeeIndex] = useState<number | null>(null);

  const { data: households = [], isLoading: areHouseholdsLoading } = useLiveQuery((q) =>
    q
      .from({ household: householdsCollection })
      .orderBy(({ household }) => household.headName, "asc"),
  );
  const { data: members = [], isLoading: areMembersLoading } = useLiveQuery((q) =>
    q.from({ member: householdMembersCollection }),
  );
  const attendanceCandidates = useMemo(
    () => buildAttendanceAttendees(households, members),
    [households, members],
  );

  const mutation = useMutation({
    mutationKey: ["CreatePwpAttendance"],
    mutationFn: async (payload: FormValues) => {
      const now = new Date().toISOString();
      const sessionId = randomUUID();
      const villageId =
        user?.villageId || attendanceCandidates.find((row) => row.villageId)?.villageId;

      if (!villageId) {
        throw new Error("Select a working village before recording PWP attendance.");
      }

      const sessionTx = pwpSessionsCollection.insert({
        id: sessionId,
        villageId,
        date: today.toISOString(),
        status: "Pending",
        notes: null,
        synchronizedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      await sessionTx.isPersisted.promise;

      await Promise.all(
        payload.attendees.map((attendee) => {
          assertPresentAttendeeVerified(attendee);
          const attendanceTx = pwpAttendanceCollection.insert({
            id: randomUUID(),
            sessionId,
            householdId: attendee.id,
            status: attendee.status!,
            remarks: attendanceRemarks(attendee),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          });
          return attendanceTx.isPersisted.promise;
        }),
      );

      return { id: sessionId };
    },
    onError: (error) => {
      console.error(error);
      Alert.alert(t("error"), t("attendance_biometric_required"));
    },
    onSuccess: () => {
      goBackOrReplace(router, "/pwp");
    },
  });

  const form = useAppForm({
    defaultValues: {
      date: new Date(),
      attendees: attendanceCandidates,
    },
    onSubmit: ({ value }) => {
      if (marked.length !== attendees.length) return;
      try {
        value.attendees.forEach(assertPresentAttendeeVerified);
      } catch {
        Alert.alert(t("verification_required"), t("attendance_biometric_required"));
        return;
      }
      mutation.mutate({ ...value, date: today });
    },
  });

  useEffect(() => {
    if (attendanceCandidates.length) {
      form.setFieldValue("attendees", attendanceCandidates);
    }
  }, [attendanceCandidates, form]);

  const attendees = useStore(form.store, ({ values }) => values.attendees);
  const presentees = attendees.filter((a) => a.status === "present");
  const absentees = attendees.filter((a) => a.status === "absent");
  const marked = attendees.filter((a) => a.status !== null);
  const selectedPresentAttendee =
    presentAttendeeIndex === null ? null : (attendees[presentAttendeeIndex] ?? null);

  const confirmSelectedPresent = (proof: AttendanceVerificationProof) => {
    if (presentAttendeeIndex === null) return;

    form.setFieldValue(
      "attendees",
      attendees.map((attendee, index) =>
        index === presentAttendeeIndex && attendee.memberId === proof.memberId
          ? { ...attendee, status: "present" as const, biometricVerification: proof }
          : attendee,
      ),
    );
  };

  if (areHouseholdsLoading || areMembersLoading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white dark:bg-gray-950">
        <ActivityIndicator />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView edges={["bottom"]} className="bg-white dark:bg-gray-950">
      <ScrollView className="pb-10">
        {/* ── Date (today only, read-only) ── */}
        <View className="border-b border-gray-100 p-4 dark:border-gray-800">
          <View className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
            <View className="flex-row items-center gap-2">
              <Calendar size={18} color={isDark ? "#9ca3af" : "#4a5565"} />
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("attendance_date")}
                </Text>
                <Text className="text-xs text-blue-500 dark:text-blue-400">{t("today")}</Text>
              </View>
            </View>
            <View className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-gray-900">
              <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                {today.toLocaleDateString(i18n.language.startsWith("sw") ? "sw-TZ" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Summary + submit ── */}
        <View className="gap-4 border-b border-gray-100 py-4 dark:border-gray-800">
          <View className="flex-row items-center justify-center gap-4 px-4">
            <Text className="text-sm text-red-500 dark:text-red-400">
              {t("absentee_count", { count: absentees.length, formattedCount: absentees.length })}
            </Text>
            <View className="size-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            <Text className="text-sm text-green-600 dark:text-green-400">
              {t("present_count", { count: presentees.length, formattedCount: presentees.length })}
            </Text>
            <View className="size-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            <Text className="text-sm">
              <Text className="text-gray-500 dark:text-gray-400">{marked.length}</Text>/
              <Text className="font-medium text-gray-950 dark:text-gray-50">
                {attendanceCandidates.length}
              </Text>
            </Text>
          </View>

          {marked.length === attendanceCandidates.length ? (
            <View className="px-4">
              <Host style={{ width: "100%", height: 44 }}>
                <Button
                  modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                  colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
                  onClick={() => form.handleSubmit()}
                >
                  <JCText>{mutation.isPending ? t("submitting") : t("submit_attendance")}</JCText>
                </Button>
              </Host>
            </View>
          ) : (
            <View className="px-4">
              <Host style={{ width: "100%", height: 44 }}>
                <Button
                  modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                  colors={{ containerColor: "#ef4444", contentColor: "#ffffff" }}
                  onClick={() =>
                    form.setFieldValue(
                      "attendees",
                      attendees.map((a) =>
                        a.status === null ? { ...a, status: "absent" as const } : a,
                      ),
                    )
                  }
                >
                  <JCText>{t("mark_all_absent")}</JCText>
                </Button>
              </Host>
            </View>
          )}
        </View>

        {/* ── Attendee list ── */}
        <form.Field name="attendees" mode="array">
          {(field) =>
            field.state.value.map((attendee, index) => (
              <form.Field key={attendee.id} name={`attendees[${index}].status`}>
                {(subField) => (
                  <CommunitySessionAttendeeListItem
                    subField={subField}
                    attendee={attendee}
                    onPresentPress={() => setPresentAttendeeIndex(index)}
                  />
                )}
              </form.Field>
            ))
          }
        </form.Field>
      </ScrollView>

      <AttendancePresentSheet
        attendee={selectedPresentAttendee}
        isOpen={presentAttendeeIndex !== null}
        onDismiss={() => setPresentAttendeeIndex(null)}
        onConfirm={confirmSelectedPresent}
      />
    </StyledSafeAreaView>
  );
}
