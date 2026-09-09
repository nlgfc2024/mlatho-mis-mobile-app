import { eq, useLiveQuery } from "@tanstack/react-db";
import { clsx } from "clsx";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useLayoutEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { getDateLocale, translateStatus } from "@/src/i18n/helpers";
import {
  householdsCollection,
  pwpAttendanceCollection,
  pwpSessionsCollection,
} from "@/src/powersync/collections";

export default function PwpShowScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const rowSeparatorStyle = useRowSeparatorStyle("top");

  const { data: sessionRows = [], isLoading: isSessionLoading } = useLiveQuery(
    (q) =>
      q
        .from({ session: pwpSessionsCollection })
        .where(({ session }) => eq(session.id, id))
        .orderBy(({ session }) => session.id, "asc")
        .limit(1),
    [id],
  );
  const { data: attendanceRows = [], isLoading: isAttendanceLoading } = useLiveQuery(
    (q) =>
      q
        .from({ attendance: pwpAttendanceCollection })
        .where(({ attendance }) => eq(attendance.sessionId, id)),
    [id],
  );
  const { data: households = [], isLoading: isHouseholdsLoading } = useLiveQuery((q) =>
    q.from({ household: householdsCollection }),
  );

  const data = useMemo(() => {
    const session = sessionRows[0];
    if (!session) return null;
    const householdById = new Map(households.map((household) => [household.id, household]));

    return {
      ...session,
      attendances: attendanceRows.map((attendance) => ({
        ...attendance,
        household: attendance.householdId ? householdById.get(attendance.householdId) : undefined,
      })),
    };
  }, [attendanceRows, households, sessionRows]);

  const sessionDate = useMemo(() => (data?.date ? new Date(data.date) : null), [data]);

  const formattedDate = sessionDate
    ? sessionDate.toLocaleDateString(getDateLocale(i18n.language), {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      })
    : "—";

  useLayoutEffect(() => {
    navigation.setOptions({
      title: sessionDate
        ? sessionDate.toLocaleDateString(getDateLocale(i18n.language), {
            weekday: "short",
            month: "short",
            day: "2-digit",
          })
        : t("session"),
    });
  }, [i18n.language, navigation, sessionDate, t]);

  if (isSessionLoading || isAttendanceLoading || isHouseholdsLoading) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </StyledSafeAreaView>
    );
  }

  const attendances = data?.attendances ?? [];
  const presents = attendances.filter((a) => a.status === "present");
  const absents = attendances.filter((a) => a.status === "absent");

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView>
        {/* ── Header ── */}
        <View className="gap-1 border-b border-gray-100 px-4 py-4 dark:border-gray-800">
          <Text className="text-2xl font-bold text-gray-950 dark:text-gray-50">{formattedDate}</Text>
          <View className="flex-row items-center gap-3 pt-1">
            <Text className="text-sm text-green-600 dark:text-green-400">
              {t("present_count", { count: presents.length, formattedCount: presents.length })}
            </Text>
            <View className="size-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            <Text className="text-sm text-red-500 dark:text-red-400">
              {t("absent_count", { count: absents.length, formattedCount: absents.length })}
            </Text>
            <View className="size-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
              {t("total_count", { count: attendances.length, formattedCount: attendances.length })}
            </Text>
          </View>
        </View>

        {/* ── Attendance rows ── */}
        {attendances.map((attendance) => (
          <View
            key={attendance.id}
            style={rowSeparatorStyle}
            className="flex-row items-center justify-between px-4 py-4"
          >
            <View>
              <Text className="text-base font-bold text-gray-950 capitalize dark:text-gray-50">
                {attendance.household?.headName}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {attendance.household?.groupCode}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <View
                className={clsx("rounded-full p-0.5", {
                  "bg-green-500": attendance.status === "present",
                  "bg-red-500": attendance.status === "absent",
                })}
              >
                {attendance.status === "present" && (
                  <Check size={12} strokeWidth={2.5} color="#fff" />
                )}
                {attendance.status === "absent" && <X size={12} strokeWidth={2.5} color="#fff" />}
              </View>
              <Text
                className={clsx("text-sm font-medium capitalize", {
                  "text-green-600 dark:text-green-400": attendance.status === "present",
                  "text-red-500 dark:text-red-400": attendance.status === "absent",
                })}
              >
                {translateStatus(t, attendance.status)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
