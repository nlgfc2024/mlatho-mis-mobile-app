import type {
  AttendanceAttendee,
  AttendanceVerificationProof,
} from "@/src/features/biometric-attendance/types";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
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
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import AttendancePresentSheet from "@/src/components/community-session/attendance-present-sheet";
import CommunitySessionAttendeeListItem from "@/src/components/community-session/community-session-attendee-list-item";
import SegmentedPicker from "@/src/components/form/segmented-picker";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import {
  assertPresentAttendeeVerified,
  attendanceRemarks,
  buildAttendanceAttendees,
} from "@/src/features/biometric-attendance/attendance-proof";
import { useAppForm } from "@/src/form";
import {
  attendanceSessionsCollection,
  householdAttendanceCollection,
  householdMembersCollection,
  householdsCollection,
} from "@/src/powersync/collections";
import { useSession } from "@/src/providers/session-context";

// Fiscal year: Q1=Jul–Sep, Q2=Oct–Dec, Q3=Jan–Mar, Q4=Apr–Jun
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
type Quarter = (typeof QUARTERS)[number];

function getFiscalYearStartYear(date: Date): number {
  return date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
}

function getCurrentFiscalQuarter(date: Date): Quarter {
  const m = date.getMonth();
  if (m >= 6 && m <= 8) return "Q1";
  if (m >= 9 && m <= 11) return "Q2";
  if (m >= 0 && m <= 2) return "Q3";
  return "Q4";
}

function quarterDateRange(
  quarter: Quarter,
  fiscalYearStartYear: number,
): { start: Date; end: Date } {
  const y = fiscalYearStartYear;
  switch (quarter) {
    case "Q1":
      return { start: new Date(y, 6, 1), end: new Date(y, 9, 0) };
    case "Q2":
      return { start: new Date(y, 9, 1), end: new Date(y, 12, 0) };
    case "Q3":
      return { start: new Date(y + 1, 0, 1), end: new Date(y + 1, 3, 0) };
    case "Q4":
      return { start: new Date(y + 1, 3, 1), end: new Date(y + 1, 6, 0) };
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

type FormValues = {
  date: Date | null;
  attendees: AttendanceAttendee[];
};

// ── Screen ──────────────────────────────────────────────────────────────────

export default function CommunitySessionCreateScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const isDark = useColorScheme() === "dark";

  const now = new Date();
  const fiscalYearStart = getFiscalYearStartYear(now);
  const currentQuarter = getCurrentFiscalQuarter(now);
  const { start: quarterStart, end: quarterEnd } = quarterDateRange(
    currentQuarter,
    fiscalYearStart,
  );

  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [showPicker, setShowPicker] = useState(false);
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
    mutationKey: ["CreateAttendance"],
    mutationFn: async (payload: FormValues) => {
      const now = new Date().toISOString();
      const sessionId = randomUUID();
      const villageId =
        user?.villageId || attendanceCandidates.find((row) => row.villageId)?.villageId;

      if (!villageId) {
        throw new Error("Select a working village before recording community attendance.");
      }

      const sessionTx = attendanceSessionsCollection.insert({
        id: sessionId,
        villageId,
        date: selectedDate.toISOString(),
        type: currentQuarter,
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
          const attendanceTx = householdAttendanceCollection.insert({
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
    onSuccess: () => router.push("/(protected)/(app)/community-session"),
  });

  const form = useAppForm({
    defaultValues: {
      date: null as Date | null,
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
      mutation.mutate(value);
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

  const openDatePicker = () => setShowPicker(true);
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
        {/* ── Quarter + date header ── */}
        <View className="gap-4 border-b border-gray-100 p-4 dark:border-gray-800">
          {/* Quarter picker — only current quarter is enabled */}
          <View className="w-full gap-1.5">
            <Text className="text-xs font-normal text-gray-950 dark:text-gray-50">
              {t("quarter")}
            </Text>
            <SegmentedPicker
              options={["Q1", "Q2", "Q3", "Q4"]}
              selectedIndex={QUARTERS.indexOf(currentQuarter)}
              fullWidth
              disabledIndices={QUARTERS.map((_, i) => i).filter(
                (i) => i !== QUARTERS.indexOf(currentQuarter),
              )}
            />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {currentQuarter} {quarterEnd.getFullYear()}
              {" · "}
              {quarterStart.toLocaleDateString(i18n.language.startsWith("sw") ? "sw-TZ" : "en-US", {
                month: "short",
                day: "2-digit",
              })}
              {" – "}
              {quarterEnd.toLocaleDateString(i18n.language.startsWith("sw") ? "sw-TZ" : "en-US", {
                month: "short",
                day: "2-digit",
              })}
            </Text>
          </View>

          {/* Date picker row */}
          {showPicker && (
            <DateTimePicker
              mode="date"
              value={selectedDate}
              display="calendar"
              minimumDate={quarterStart}
              maximumDate={quarterEnd}
              accentColor="#0d542b"
              onValueChange={(_event, picked) => {
                setSelectedDate(picked);
                setShowPicker(false);
              }}
              onDismiss={() => setShowPicker(false)}
            />
          )}
          <Pressable
            onPress={openDatePicker}
            className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
          >
            <View className="flex-row items-center gap-2">
              <Calendar size={18} color={isDark ? "#9ca3af" : "#4a5565"} />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("attendance_date")}
              </Text>
            </View>
            <View className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-gray-900">
              <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                {selectedDate.toLocaleDateString(
                  i18n.language.startsWith("sw") ? "sw-TZ" : "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  },
                )}
              </Text>
            </View>
          </Pressable>
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

        {/* ── Attendance list ── */}
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
