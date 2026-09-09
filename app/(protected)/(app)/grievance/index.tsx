import { useLiveQuery } from "@tanstack/react-db";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { Link } from "expo-router";
import { Calendar, CloudCheck, CloudOff } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import SearchInput from "@/src/components/form/search-input";
import PendingGrievancesSyncBanner from "@/src/components/grievance/pending-grievances-sync-banner";
import CreateFab from "@/src/components/ui/create-fab";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { PullToRefresh } from "@/src/components/ui/pull-to-refresh";
import { useSyncRefresh } from "@/src/hooks/use-sync-refresh";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translateStatus } from "@/src/i18n/helpers";
import {
  grievanceStatusDotClassName,
  grievanceStatusTextClassName,
} from "@/src/lib/grievance-status";
import { grievancesCollection } from "@/src/powersync/collections";
import {
  needsGrievanceUpload,
  SYNCED_GRIEVANCE_STATUS,
} from "@/src/powersync/grievance-sync";

const statues = ["All", "Synchronized", "Pending"] as const;

type Status = (typeof statues)[number];

function grievanceSyncStatus(grievance: Record<string, unknown>) {
  return needsGrievanceUpload(grievance) ? "Pending" : SYNCED_GRIEVANCE_STATUS;
}

export default function GrievanceHomeScreen() {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<Status>("All");
  const isDark = useColorScheme() === "dark";
  const calendarColor = isDark ? "#9ca3af" : "#4a5565";
  const pendingIconColor = isDark ? "#facc15" : "#ca8a04";
  const syncedIconColor = isDark ? "#4ade80" : "#16a34a";
  const rowSeparatorStyle = useRowSeparatorStyle("top");
  const { refreshing, refresh } = useSyncRefresh();

  const { data: rows = [] } = useLiveQuery(
    (q) =>
      q
        .from({ grievance: grievancesCollection })
        .orderBy(({ grievance }) => grievance.createdAt, "desc"),
    [],
  );
  const data = rows.filter(
    (grievance) =>
      selectedStatus === "All" ||
      grievanceSyncStatus(grievance) === selectedStatus,
  );

  return (
    <>
      {/* <Stack.Header style={{ color: "#ffffff", backgroundColor: "#0d542b" }} />
      <Stack.Title>{t("grievance")}</Stack.Title> */}

      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 bg-white dark:bg-gray-950"
      >
        <View className="flex-none">
          <PendingGrievancesSyncBanner />

          <View className="px-4 pt-2 pb-4">
            <View className="mt-4 flex flex-row items-stretch justify-between gap-3">
              <View className="flex-1">
                <SearchInput placeholder={t("search_grievance")} />
              </View>
            </View>

            <View className="mt-4 flex flex-row items-center gap-2">
              {statues.map((state) => (
                <Pressable
                  key={state}
                  onPress={() => setSelectedStatus(state)}
                  className={`rounded-full border px-3 py-1 ${
                    state === selectedStatus
                      ? "border-gray-950 bg-gray-950 dark:border-gray-100 dark:bg-gray-100"
                      : "border-gray-100 bg-gray-100 dark:border-gray-900 dark:bg-gray-900"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      state === selectedStatus
                        ? "text-gray-50 dark:text-gray-950"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {translateStatus(t, state)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {data.length > 0 ? (
          <PullToRefresh refreshing={refreshing} onRefresh={refresh}>
            <ScrollView>
              <View>
                {data.map((grievance) => {
                  const syncStatus = grievanceSyncStatus(grievance);
                  const isPendingUpload = syncStatus === "Pending";

                  return (
                    <Link
                      key={grievance.id}
                      href={{
                        pathname: "/(protected)/(app)/grievance/[id]",
                        params: { id: grievance.id },
                      }}
                      asChild
                    >
                      <Pressable
                        style={rowSeparatorStyle}
                        className="px-4 py-3 focus:bg-pressed active:bg-pressed"
                      >
                        <View className="flex flex-row items-center justify-between gap-4">
                          <View className="flex flex-1 flex-row items-center gap-2">
                            <View
                              className={clsx(
                                "size-1.5 rounded-full",
                                grievanceStatusDotClassName(grievance.status),
                              )}
                            />
                            <Text
                              className={clsx(
                                "text-xs font-medium capitalize",
                                grievanceStatusTextClassName(grievance.status),
                              )}
                            >
                              {translateStatus(t, grievance.status)}
                            </Text>
                          </View>

                          {isPendingUpload ? (
                            <View className="flex flex-none flex-row items-center gap-2">
                              <CloudOff size={16} color={pendingIconColor} />
                              <Text className="text-xs font-normal text-yellow-600 dark:text-yellow-300">
                                {grievance.createdAt
                                  ? formatDistanceToNow(
                                      new Date(grievance.createdAt),
                                      {
                                        addSuffix: true,
                                      },
                                    )
                                  : t("recently")}
                              </Text>
                            </View>
                          ) : (
                            <View className="flex flex-none flex-row items-center gap-2">
                              <CloudCheck size={16} color={syncedIconColor} />
                              <Text className="text-xs font-normal text-green-600 dark:text-green-400">
                                {translateStatus(t, syncStatus)}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View className="flex flex-col gap-0.5">
                          <Text className="text-base font-bold text-gray-950 dark:text-gray-50">
                            {grievance.type}
                          </Text>
                          <Text
                            className="text-sm font-normal text-gray-600 dark:text-gray-400"
                            numberOfLines={2}
                          >
                            {grievance?.description}
                          </Text>
                        </View>

                        {grievance.incidentDate && (
                          <View className="mt-2 flex flex-row items-center gap-1.5">
                            <Calendar size={14} color={calendarColor} />
                            <Text className="text-xs leading-none font-normal text-gray-600 dark:text-gray-400">
                              {new Date(
                                grievance.incidentDate,
                              ).toLocaleDateString("en-Us", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })}
                            </Text>
                          </View>
                        )}

                        {/* <View>
                  <Text className="text-sm font-normal text-blue-500">
                    {JSON.stringify(grievance, null, 2)}
                  </Text>
                </View> */}
                      </Pressable>
                    </Link>
                  );
                })}
              </View>
            </ScrollView>
          </PullToRefresh>
        ) : (
          <PullToRefresh refreshing={refreshing} onRefresh={refresh}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              className="flex-1 border-t border-gray-200 dark:border-gray-800"
              contentContainerClassName="p-4"
            >
              <View className="flex-1 items-center justify-center">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t("no_item_found")}
                </Text>
              </View>
            </ScrollView>
          </PullToRefresh>
        )}

        <CreateFab
          href="/(protected)/(app)/grievance/create"
          contentDescription={t("file_new_grievance")}
        />
      </StyledSafeAreaView>
    </>
  );
}
