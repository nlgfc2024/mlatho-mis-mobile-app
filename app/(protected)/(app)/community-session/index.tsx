import { useLiveQuery } from "@tanstack/react-db";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import CommunitySessionAttendanceListItem from "@/src/components/community-session/community-session-attendance-list-item";
import PendingCommunitySessionsSyncBanner from "@/src/components/community-session/pending-community-session-sync-banner";
import SearchInput from "@/src/components/form/search-input";
import CreateFab from "@/src/components/ui/create-fab";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translateStatus } from "@/src/i18n/helpers";
import {
  attendanceSessionsCollection,
  householdAttendanceCollection,
} from "@/src/powersync/collections";

const statues = ["All", "Synchronized", "Pending"] as const;

type Status = (typeof statues)[number];

export default function CommunitySessionIndexScreen() {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<Status>("All");

  const { data: sessionRows = [], isLoading: isSessionsLoading } = useLiveQuery((q) =>
    q
      .from({ session: attendanceSessionsCollection })
      .orderBy(({ session }) => session.createdAt, "desc"),
  );
  const { data: attendanceRows = [], isLoading: isAttendanceLoading } = useLiveQuery((q) =>
    q.from({ attendance: householdAttendanceCollection }),
  );

  const data = useMemo(
    () =>
      sessionRows
        .filter((session) => selectedStatus === "All" || session.status === selectedStatus)
        .map((session) => ({
          ...session,
          attendances: attendanceRows.filter(
            (attendance) => attendance.sessionId === session.id && !attendance.deletedAt,
          ),
        })),
    [attendanceRows, selectedStatus, sessionRows],
  );

  if (isSessionsLoading || isAttendanceLoading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white dark:bg-gray-950">
        <ActivityIndicator />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <View>
        <PendingCommunitySessionsSyncBanner />

        <View className="flex flex-col gap-4 p-4">
          <View>
            <SearchInput placeholder={t("search_household")} />
          </View>

          <View className="flex flex-row items-center gap-2">
            {statues.map((state) => (
              <Pressable
                key={state}
                onPress={() => setSelectedStatus(state)}
                className={`rounded-full px-3 py-1 ${state === selectedStatus ? "bg-gray-950 dark:bg-gray-100" : "bg-gray-100 dark:bg-gray-900"}`}
              >
                <Text
                  className={`text-sm font-medium ${state === selectedStatus ? "text-gray-50 dark:text-gray-950" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {translateStatus(t, state)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <ScrollView className="pb-10">
        <View>
          {data.map((attendance) => (
            <CommunitySessionAttendanceListItem key={attendance.id} attendance={attendance} />
          ))}
        </View>
      </ScrollView>

      <CreateFab
        href="/(protected)/(app)/community-session/create"
        contentDescription={t("attendance")}
      />
    </StyledSafeAreaView>
  );
}
