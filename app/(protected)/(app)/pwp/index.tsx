import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import SearchInput from "@/src/components/form/search-input";
import CreateFab from "@/src/components/ui/create-fab";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import PendingPwpSyncBanner from "@/src/components/pwp/pending-pwp-sync-banner";
import PwpAttendanceListItem from "@/src/components/pwp/pwp-attendance-list-item";
import { pwpAttendanceCollection, pwpSessionsCollection } from "@/src/powersync/collections";

export default function PwpIndexScreen() {
  const { t } = useTranslation();
  const { data: sessionRows = [], isLoading: isSessionsLoading } = useLiveQuery((q) =>
    q.from({ session: pwpSessionsCollection }).orderBy(({ session }) => session.createdAt, "desc"),
  );
  const { data: attendanceRows = [], isLoading: isAttendanceLoading } = useLiveQuery((q) =>
    q.from({ attendance: pwpAttendanceCollection }),
  );

  const data = useMemo(
    () =>
      sessionRows.map((session) => ({
        ...session,
        attendances: attendanceRows.filter(
          (attendance) => attendance.sessionId === session.id && !attendance.deletedAt,
        ),
      })),
    [attendanceRows, sessionRows],
  );

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <PendingPwpSyncBanner />

      <View className="px-4 py-3">
        <SearchInput placeholder={t("search_by_date")} />
      </View>

      {isSessionsLoading || isAttendanceLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : data.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-base font-medium text-gray-950 dark:text-gray-50">
            {t("no_sessions_yet")}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t("tap_new_record_attendance")}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1">
          {data.map((session) => (
            <PwpAttendanceListItem key={session.id} session={session} />
          ))}
        </ScrollView>
      )}

      <CreateFab
        href="/(protected)/(app)/pwp/create"
        contentDescription={t("pwp_create_attendance")}
      />
    </StyledSafeAreaView>
  );
}
