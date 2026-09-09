import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { Stack, useLocalSearchParams } from "expo-router";
import { Calendar, ChevronRight, CloudCheck, CloudOff, MapPinned } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  InteractionManager,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";

import GrievanceComments from "@/src/components/grievance/grievance-comments";
import GrievanceEvidenceSummary from "@/src/components/grievance/grievance-evidence-summary";
import PendingGrievanceSyncBanner from "@/src/components/grievance/pending-grievance-sync-banner";
import { getRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { PullToRefresh } from "@/src/components/ui/pull-to-refresh";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { useSyncRefresh } from "@/src/hooks/use-sync-refresh";
import { translateStatus } from "@/src/i18n/helpers";
import { type GrievanceEvidence, normalizeGrievanceEvidence } from "@/src/lib/grievance-evidence";
import {
  grievanceStatusDotClassName,
  grievanceStatusTextClassName,
} from "@/src/lib/grievance-status";
import {
  districtsCollection,
  grievancesCollection,
  regionsCollection,
  villagesCollection,
  wardsCollection,
} from "@/src/powersync/collections";
import { needsGrievanceUpload } from "@/src/powersync/grievance-sync";

export default function ViewGrievanceScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const mutedIconColor = isDark ? "#9ca3af" : "#6a7282";
  const subtleIconColor = isDark ? "#9ca3af" : "#4a5565";
  const queryClient = useQueryClient();
  const { refreshing, refresh } = useSyncRefresh(() =>
    queryClient.invalidateQueries({ queryKey: ["GetTickets"] }),
  );

  const grievanceId = params.id;

  const { data: grievanceRows = [], isReady: isGrievanceReady } = useLiveQuery(
    (q) => {
      if (!grievanceId) return undefined;
      return q
        .from({ grievance: grievancesCollection })
        .where(({ grievance }) => eq(grievance.id, grievanceId))
        .orderBy(({ grievance }) => grievance.id, "asc")
        .limit(1);
    },
    [grievanceId],
  );
  const grievance = grievanceRows[0];
  const { data: locationRows = [] } = useLiveQuery(
    (q) => {
      if (!grievance?.villageId) return undefined;

      return q
        .from({ village: villagesCollection })
        .where(({ village }) => eq(village.id, grievance.villageId))
        .leftJoin({ ward: wardsCollection }, ({ village, ward }) => eq(village.wardId, ward.id))
        .leftJoin({ district: districtsCollection }, ({ ward, district }) =>
          eq(ward.districtId, district.id),
        )
        .leftJoin({ region: regionsCollection }, ({ district, region }) =>
          eq(district.regionId, region.id),
        )
        .select(({ village, ward, district, region }) => ({
          villageName: village.name,
          wardName: ward.name,
          districtName: district.name,
          regionName: region.name,
        }));
    },
    [grievance?.villageId],
  );
  const location = locationRows[0];
  const evidence = useMemo(
    () =>
      normalizeGrievanceEvidence({
        images: grievance?.evidenceImages,
        videos: grievance?.evidenceVideos,
        audios: grievance?.evidenceAudios,
      }),
    [grievance?.evidenceAudios, grievance?.evidenceImages, grievance?.evidenceVideos],
  );

  if (grievanceId && !isGrievanceReady) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center gap-2">
          <ActivityIndicator size="large" color={isDark ? "#4ade80" : "#15803d"} />
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
            {t("loading")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  if (!grievance) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
            {t("item_not_found")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  const isPendingUpload = needsGrievanceUpload(grievance);

  return (
    <>
      <Stack.Header style={{ color: "#ffffff", backgroundColor: "#0d542b" }} />
      <Stack.Title>{t("grievance")}</Stack.Title>

      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <PendingGrievanceSyncBanner grievance={grievance} />
        <PullToRefresh refreshing={refreshing} onRefresh={refresh}>
          <ScrollView contentContainerClassName="px-4 pt-4" contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex flex-1 flex-col justify-between gap-5">
              <View className="flex-1">
                <View className="pb-4">
                  <View className="flex flex-row items-center justify-between gap-4">
                    <View className="flex flex-1 flex-row items-center gap-2">
                      <View
                        className={clsx(
                          "size-2 rounded-full",
                          grievanceStatusDotClassName(grievance.status),
                        )}
                      />
                      <Text
                        className={clsx(
                          "text-sm font-medium",
                          grievanceStatusTextClassName(grievance.status),
                        )}
                      >
                        {translateStatus(t, grievance.status)}
                      </Text>
                    </View>

                    {isPendingUpload ? (
                      <View className="flex flex-none flex-row items-center gap-2">
                        <CloudOff size={16} color={isDark ? "#facc15" : "#ca8a04"} />
                        <Text className="text-xs font-normal text-yellow-600 dark:text-yellow-300">
                          {grievance.createdAt
                            ? formatDistanceToNow(new Date(grievance.createdAt), {
                                addSuffix: true,
                              })
                            : t("recently")}
                        </Text>
                      </View>
                    ) : (
                      <View className="flex flex-none flex-row items-center gap-2">
                        <CloudCheck size={16} color={isDark ? "#4ade80" : "#16a34a"} />
                        <Text className="text-xs font-normal text-green-600 dark:text-green-400">
                          {t("synchronized")}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="mt-1">
                    <Text className="text-xl font-bold text-gray-950 dark:text-gray-50">
                      {grievance.type}
                    </Text>
                  </View>

                  {/* <View>
                <Text>{grievance.reporterName}</Text>
                <Text>{grievance.reporterPhone}</Text>
              </View> */}

                  <View className="mt-1 flex flex-row items-center justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        GRV-2025-00123
                      </Text>
                    </View>

                    {grievance.incidentDate && (
                      <View className="flex flex-none flex-row items-center gap-2">
                        <Calendar size={16} strokeWidth={2.25} color={mutedIconColor} />
                        <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
                          {new Date(grievance.incidentDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View>
                  <Text className="text-base font-normal text-gray-700 dark:text-gray-300">
                    {grievance.description}
                  </Text>
                </View>

                <View className="mt-4 flex flex-col gap-4">
                  <View className="rounded-2xl bg-gray-100 px-4 dark:bg-gray-900">
                    <View
                      style={getRowSeparatorStyle("bottom", isDark)}
                      className="flex flex-row gap-4 py-4"
                    >
                      <View className="w-1/4">
                        <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                          {t("type")}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm font-normal text-gray-600 dark:text-gray-400"
                          numberOfLines={1}
                        >
                          {grievance.type}
                        </Text>
                      </View>
                    </View>

                    <View className="flex flex-row gap-4 py-4">
                      <View className="w-1/4">
                        <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                          {t("category")}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm font-normal text-gray-600 dark:text-gray-400"
                          numberOfLines={1}
                        >
                          {grievance.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {location?.villageName && (
                  <View className="mt-6 flex flex-col gap-2">
                    <View className="flex flex-row items-center gap-1.5">
                      <MapPinned size={16} strokeWidth={2.25} color={mutedIconColor} />
                      <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                        {location.villageName}
                      </Text>
                    </View>

                    <View className="flex flex-row items-center gap-2">
                      <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
                        {location.regionName}
                      </Text>
                      <ChevronRight size={16} color={subtleIconColor} />
                      <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
                        {location.districtName}
                      </Text>
                      <ChevronRight size={16} color={subtleIconColor} />
                      <Text className="font-normals text-sm text-gray-600 dark:text-gray-400">
                        {location.wardName}
                      </Text>
                    </View>
                  </View>
                )}

                <DeferredGrievanceContent
                  key={grievance.id}
                  evidence={evidence}
                  grievanceId={grievance.id}
                  ticketId={grievance.internalId}
                  cachedComments={grievance.comments}
                />
              </View>
            </View>

            {grievance.status === "Pending" && (
              <View className="flex-none">
                <Host style={{ width: "100%", height: 44 }}>
                  <Button
                    modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                    colors={{
                      contentColor: isDark ? "#ffc9c9" : "#fb2c36",
                      containerColor: isDark ? "#460809" : "#ffe2e2",
                    }}
                  >
                    <JCText>{t("delete_grievance")}</JCText>
                  </Button>
                </Host>
              </View>
            )}
          </ScrollView>
        </PullToRefresh>
      </StyledSafeAreaView>
    </>
  );
}

function DeferredGrievanceContent({
  evidence,
  grievanceId,
  ticketId,
  cachedComments,
}: {
  evidence: GrievanceEvidence;
  grievanceId: string;
  ticketId?: string | null;
  cachedComments?: unknown;
}) {
  const [isReady, setIsReady] = useState(false);
  const isDark = useColorScheme() === "dark";

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setIsReady(true));
    return () => task.cancel();
  }, []);

  if (!isReady) {
    return (
      <View className="items-center justify-center py-6">
        <ActivityIndicator size="small" color={isDark ? "#4ade80" : "#15803d"} />
      </View>
    );
  }

  return (
    <>
      <GrievanceEvidenceSummary evidence={evidence} />
      <GrievanceComments
        grievanceId={grievanceId}
        ticketId={ticketId}
        cachedComments={cachedComments}
      />
    </>
  );
}
