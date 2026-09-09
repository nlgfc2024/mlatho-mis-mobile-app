import { BlurView } from "expo-blur";
import * as Device from "expo-device";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { UserRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import AnnouncementCarousel from "@/src/components/dashboard/announcement-carousel";
import {
  DASHBOARD_GROUP_BY_ID,
  getDashboardGroupsForRole,
} from "@/src/components/dashboard/dashboard-groups";
import { prioritizeDashboardTileIds } from "@/src/components/dashboard/dashboard-role-mapping";
import DashboardStatsRow from "@/src/components/dashboard/dashboard-stats-row";
import ExecutiveMeContent from "@/src/components/dashboard/executive-me-content";
import FieldOperationsStats from "@/src/components/dashboard/field-operations-stats";
import GrmMetrics from "@/src/components/dashboard/grm-metrics";
import GrmRecentGrievances from "@/src/components/dashboard/grm-recent-grievances";
import ModuleTile from "@/src/components/dashboard/module-tile";
import { MODULE_TILE_BY_ID } from "@/src/components/dashboard/module-tiles";
import DashboardNotificationButton from "@/src/components/dashboard/notification-button";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { canUseAccessModule } from "@/src/features/access-profile/permissions";
import { isImisAdministratorRole } from "@/src/features/access-profile/roles";
import { useActiveDashboardGroup } from "@/src/lib/active-dashboard";
import { useDashboardLayout } from "@/src/lib/dashboard-layout";
import { getUserDisplayName } from "@/src/lib/user-display-name";
import { useSession } from "@/src/providers/session-context";

const DARK_BUTTON_BLUR_INTENSITY = 60;

function chunkItems<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { accessProfile, activeRole, user } = useSession();
  const layout = useDashboardLayout();
  const activeGroupId = useActiveDashboardGroup();
  const grantedGroups = getDashboardGroupsForRole(activeRole?.name, activeRole?.isSystem);
  const activeGroup =
    grantedGroups.find((group) => group.id === activeGroupId) ??
    grantedGroups[0] ??
    DASHBOARD_GROUP_BY_ID[activeGroupId];
  const resolvedGroupId = activeGroup.id;
  const isDark = useColorScheme() === "dark";
  const isImisAdministrator = isImisAdministratorRole(activeRole);
  const backgroundWidth = Math.min(width * 1.04, 560);

  const orderedTileIds = prioritizeDashboardTileIds(
    layout.order.filter((id) => isImisAdministrator || activeGroup.tileIds.includes(id)),
    activeRole?.name,
    isImisAdministrator ? layout.order[0] : activeGroup.tileIds[0],
  );
  const visibleTiles = orderedTileIds
    .filter((id) => isImisAdministrator || !layout.hidden.includes(id))
    .map((id) => MODULE_TILE_BY_ID[id])
    .filter((tile) =>
      canUseAccessModule({
        accessProfile,
        activeRole,
        moduleNames: tile.permissionModules,
        permissionNames: tile.permissionNames,
      }),
    );
  const tileColumnCount = Device.deviceType === Device.DeviceType.TABLET ? 3 : 2;
  const rows = chunkItems(visibleTiles, tileColumnCount);
  const visibleActions = isImisAdministrator
    ? []
    : (activeGroup.actions ?? []).filter((action) =>
        canUseAccessModule({
          accessProfile,
          activeRole,
          moduleNames: action.permissionModules,
          operation: "write",
        }),
      );

  // Executive / M&E surfaces the Quick Information KPI overview inline (full
  // bleed) on a green header that flows into the KPI hero; every other group
  // shows the padded stats + quick-actions grid on a white header.
  const isExecutive = resolvedGroupId === "executive_me" && !isImisAdministrator;
  const accountIconColor = isExecutive ? "#dcfce7" : isDark ? "#d1d5db" : "#6a7282";
  const displayName = getUserDisplayName({
    otherNames: accessProfile?.user?.otherNames,
    lastName: accessProfile?.user?.lastName,
    fallback: user?.fullName ?? user?.username,
  });

  const topBar = (
    <View className="flex flex-row items-center justify-between gap-4">
      <View className="flex flex-1 flex-col gap-1">
        <Text
          className={`text-base font-medium ${
            isExecutive ? "text-white" : "text-gray-950 dark:text-gray-50"
          }`}
        >
          {displayName}
        </Text>
        {activeRole?.name ? (
          <Text
            className={`text-xs ${
              isExecutive ? "text-green-200" : "text-gray-500 dark:text-gray-200"
            }`}
          >
            {activeRole.name}
          </Text>
        ) : null}
      </View>

      <View className="flex-none flex-row items-center gap-2">
        <DashboardNotificationButton onGreen={isExecutive} />

        <Link href={"/account"} asChild push>
          <Pressable
            className={`flex flex-row items-center justify-center overflow-hidden rounded-full border p-2 ${
              isExecutive
                ? "border-[#093b1e] bg-[#093b1e]"
                : "border-gray-100 bg-gray-100 dark:border-gray-950 dark:bg-transparent"
            }`}
          >
            {!isExecutive && isDark ? (
              <BlurView
                pointerEvents="none"
                intensity={DARK_BUTTON_BLUR_INTENSITY}
                tint="dark"
                style={styles.darkButtonBlur}
              />
            ) : null}
            <UserRound size={20} color={accountIconColor} />
          </Pressable>
        </Link>
      </View>
    </View>
  );

  const quickActions = (
    <View className="flex flex-col gap-5">
      <View className="flex flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
          {t(isImisAdministrator ? "all_modules" : "quick_actions")}
        </Text>

        {!isImisAdministrator ? (
          <Link href={"/(protected)/(app)/customize-tiles"} asChild push>
            <Pressable>
              <Text className="text-sm font-medium text-green-900 dark:text-green-100">
                {t("edit")}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

      {rows.map((row, index) => (
        <View key={index} className="flex flex-row gap-5">
          {row.map((tile) => (
            <ModuleTile
              key={tile.id}
              icon={tile.icon}
              title={t(tile.titleKey)}
              subtitle={t(tile.subtitleKey)}
              href={tile.href}
              push={tile.push}
              muted={tile.muted}
            />
          ))}
          {Array.from({ length: tileColumnCount - row.length }, (_, spacerIndex) => (
            <View key={`spacer-${spacerIndex}`} className="flex-1" />
          ))}
        </View>
      ))}

      {visibleTiles.length === 0 ? (
        <Text className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("no_tiles_visible")}
        </Text>
      ) : null}
    </View>
  );

  if (isExecutive) {
    return (
      <StyledSafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-[#0d542b]">
        <ScrollView className="bg-gray-100 dark:bg-gray-950" contentContainerClassName="pb-6">
          <View className="bg-[#0d542b] px-4 pt-4 pb-4">{topBar}</View>

          <ExecutiveMeContent />
          <View className="px-4 pt-6">{quickActions}</View>
        </ScrollView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView contentContainerClassName="gap-6 pb-6">
        {!isDark ? (
          <Image
            accessible={false}
            pointerEvents="none"
            source={require("@/assets/images/dashboard-top-right-dots.png")}
            contentFit="contain"
            contentPosition="top right"
            style={[
              styles.dashboardBackground,
              { width: backgroundWidth, height: backgroundWidth * 0.75 },
            ]}
          />
        ) : null}

        <View className="px-4 pt-4">{topBar}</View>

        <View className="gap-6 px-4 pb-2">
          <AnnouncementCarousel />

          {resolvedGroupId === "grm" ? (
            <GrmMetrics />
          ) : resolvedGroupId === "field_operations" ? (
            <FieldOperationsStats stats={activeGroup.stats} />
          ) : (
            <DashboardStatsRow stats={activeGroup.stats} />
          )}

          {visibleActions.length > 0 ? (
            <View className="flex flex-row gap-3">
              {visibleActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Link key={action.id} href={action.href} asChild push>
                    <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-green-900 px-4 py-3.5">
                      <ActionIcon size={18} color="#ffffff" />
                      <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                        {t(action.labelKey)}
                      </Text>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          ) : null}

          {quickActions}

          {resolvedGroupId === "grm" && !isImisAdministrator ? <GrmRecentGrievances /> : null}
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}

const styles = StyleSheet.create({
  dashboardBackground: {
    position: "absolute",
    right: -8,
    top: -20,
  },
  darkButtonBlur: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
