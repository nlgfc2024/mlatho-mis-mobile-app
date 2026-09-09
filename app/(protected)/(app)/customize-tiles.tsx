import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  DASHBOARD_GROUP_BY_ID,
  getDashboardGroupsForRole,
} from "@/src/components/dashboard/dashboard-groups";
import DraggableTileList from "@/src/components/dashboard/draggable-tile-list";
import { MODULE_TILE_BY_ID, type ModuleTileId } from "@/src/components/dashboard/module-tiles";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { canUseAccessModule } from "@/src/features/access-profile/permissions";
import { useActiveDashboardGroup } from "@/src/lib/active-dashboard";
import { saveDashboardLayout, useDashboardLayout } from "@/src/lib/dashboard-layout";
import { goBackOrReplace } from "@/src/lib/navigation";
import { useSession } from "@/src/providers/session-context";

export default function CustomizeTilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const layout = useDashboardLayout();
  const activeGroupId = useActiveDashboardGroup();
  const { accessProfile, activeRole } = useSession();
  const activeGroup =
    getDashboardGroupsForRole(activeRole?.name, activeRole?.isSystem).find(
      (group) => group.id === activeGroupId,
    ) ?? DASHBOARD_GROUP_BY_ID[activeGroupId];
  const editableIds = useMemo(
    () =>
      layout.order.filter((id) => {
        const tile = MODULE_TILE_BY_ID[id];
        return (
          activeGroup.tileIds.includes(id) &&
          canUseAccessModule({
            accessProfile,
            activeRole,
            moduleNames: tile.permissionModules,
            permissionNames: tile.permissionNames,
          })
        );
      }),
    [accessProfile, activeGroup.tileIds, activeRole, layout.order],
  );

  const [order, setOrder] = useState<ModuleTileId[]>(editableIds);
  const [hidden, setHidden] = useState<ModuleTileId[]>(
    layout.hidden.filter((id) => editableIds.includes(id)),
  );

  const toggle = (id: ModuleTileId) => {
    setHidden((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleReset = () => {
    setOrder(activeGroup.tileIds.filter((id) => editableIds.includes(id)));
    setHidden([]);
  };

  const handleDone = () => {
    const editableIdSet = new Set(editableIds);
    saveDashboardLayout({
      order: [...order, ...layout.order.filter((id) => !editableIdSet.has(id))],
      hidden: [...layout.hidden.filter((id) => !editableIdSet.has(id)), ...hidden],
    });
    goBackOrReplace(router, "/dashboard");
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <ScrollView contentContainerClassName="px-4 pt-4 pb-4">
          <View className="flex-row items-center justify-between gap-3 pb-3">
            <Text className="flex-1 text-xs text-gray-500 dark:text-gray-400">
              {t("customize_tiles_hint")}
            </Text>
            <Pressable onPress={handleReset}>
              <Text className="text-sm font-medium text-green-900 dark:text-green-100">
                {t("reset")}
              </Text>
            </Pressable>
          </View>

          <DraggableTileList order={order} hidden={hidden} onReorder={setOrder} onToggle={toggle} />
        </ScrollView>

        <View className="bg-white px-4 pt-4 dark:bg-gray-950">
          <Pressable onPress={handleDone} className="items-center rounded-full bg-green-900 py-3.5">
            <Text className="text-sm font-semibold text-white">{t("done")}</Text>
          </Pressable>
        </View>
      </StyledSafeAreaView>
    </GestureHandlerRootView>
  );
}
