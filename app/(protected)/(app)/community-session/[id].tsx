import { eq, useLiveQuery } from "@tanstack/react-db";
import { clsx } from "clsx";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useLayoutEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import Headline from "@/src/components/ui/headline";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { getDateLocale, translateStatus } from "@/src/i18n/helpers";
import {
  attendanceSessionsCollection,
  householdAttendanceCollection,
  householdsCollection,
  villagesCollection,
} from "@/src/powersync/collections";

export default function CommunitySessionShowScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const rowSeparatorStyle = useRowSeparatorStyle("top");

  const { data: sessionRows = [], isLoading: isSessionLoading } = useLiveQuery(
    (q) =>
      q
        .from({ session: attendanceSessionsCollection })
        .where(({ session }) => eq(session.id, id))
        .orderBy(({ session }) => session.id, "asc")
        .limit(1),
    [id],
  );
  const { data: attendanceRows = [], isLoading: isAttendanceLoading } = useLiveQuery(
    (q) =>
      q
        .from({ attendance: householdAttendanceCollection })
        .where(({ attendance }) => eq(attendance.sessionId, id)),
    [id],
  );
  const { data: households = [], isLoading: isHouseholdsLoading } = useLiveQuery((q) =>
    q.from({ household: householdsCollection }),
  );
  const { data: villages = [], isLoading: isVillagesLoading } = useLiveQuery((q) =>
    q.from({ village: villagesCollection }),
  );

  const data = useMemo(() => {
    const session = sessionRows[0];
    if (!session) return null;

    const householdById = new Map(households.map((household) => [household.id, household]));
    const village = villages.find((row) => row.id === session.villageId) ?? null;

    return {
      ...session,
      village,
      attendances: attendanceRows.map((attendance) => ({
        ...attendance,
        session,
        household: attendance.householdId ? householdById.get(attendance.householdId) : undefined,
      })),
    };
  }, [attendanceRows, households, sessionRows, villages]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: data?.village?.name ?? t("village"),
    });
  }, [navigation, data?.village, t]);

  if (isSessionLoading || isAttendanceLoading || isHouseholdsLoading || isVillagesLoading) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </StyledSafeAreaView>
    );
  }

  const attendances = data?.attendances ?? [];

  const presents = attendances.filter((attendance) => {
    return attendance.status === "present";
  });

  const absents = attendances.filter((attendance) => {
    return attendance.status === "absent";
  });

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView className="py-4">
        <View className="gap-4 px-4">
          <View>
            <Text className="text-sm font-normal text-green-600 dark:text-green-400">
              {data?.village?.name}
            </Text>
            <Headline>{data?.type}</Headline>
            <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
              {data?.type ?? "—"} ·{" "}
              {new Date(data?.date || "").toLocaleDateString(getDateLocale(i18n.language), {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
            </Text>
          </View>
        </View>

        <View className="mt-5 flex flex-col gap-4">
          <View className="flex flex-row justify-between px-4">
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t("history")}</Text>

            <View className="flex flex-row items-center gap-2">
              <Text className="text-sm font-normal text-green-600 dark:text-green-400">
                {t("present_count", { count: presents.length, formattedCount: presents.length })}
              </Text>
              <View className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
              <Text className="text-sm font-normal text-red-600 dark:text-red-400">
                {t("absent_count", { count: absents.length, formattedCount: absents.length })}
              </Text>
              <View className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
              <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                {t("total_count", {
                  count: attendances.length,
                  formattedCount: attendances.length,
                })}
              </Text>
            </View>
          </View>

          <View>
            {attendances.map((attendance) => (
              <View
                key={attendance.id}
                style={rowSeparatorStyle}
                className="flex flex-row items-center justify-between px-4 py-4"
              >
                <View>
                  <Text className="text-base font-bold text-gray-950 capitalize dark:text-gray-50">
                    {attendance.household?.headName}
                  </Text>

                  <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
                    {attendance.household?.groupCode}
                  </Text>
                </View>

                <View className="flex min-w-20 flex-row items-center justify-start gap-2">
                  <View
                    className={clsx("rounded-full p-0.5", {
                      "bg-green-500": attendance.status === "present",
                      "bg-red-500": attendance.status === "absent",
                    })}
                  >
                    {attendance.status === "present" && (
                      <Check size={12} strokeWidth={2.5} color={"#fff"} />
                    )}
                    {attendance.status === "absent" && (
                      <X size={12} strokeWidth={2.5} color={"#fff"} />
                    )}
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
          </View>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
