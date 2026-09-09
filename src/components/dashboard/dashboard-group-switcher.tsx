import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { BlurView } from "expo-blur";
import { Check, ChevronDown } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import { setActiveDashboardGroup, useActiveDashboardGroup } from "@/src/lib/active-dashboard";
import { useSession } from "@/src/providers/session-context";

import { DASHBOARD_GROUP_BY_ID, getDashboardGroupsForRole } from "./dashboard-groups";

const DARK_ICON_BLUR_INTENSITY = 60;

const styles = StyleSheet.create({
  darkIconContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
});

/**
 * Trigger card + Jetpack Compose bottom sheet for switching between dashboards
 * granted to the user's currently selected role.
 */
export default function DashboardGroupSwitcher() {
  const { t } = useTranslation();
  const { width: sheetWidth } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const { activeRole } = useSession();
  const activeId = useActiveDashboardGroup();
  const availableGroups = useMemo(
    () => getDashboardGroupsForRole(activeRole?.name, activeRole?.isSystem),
    [activeRole?.isSystem, activeRole?.name],
  );
  const activeGroup =
    availableGroups.find((group) => group.id === activeId) ??
    availableGroups[0] ??
    DASHBOARD_GROUP_BY_ID[activeId];
  const ActiveIcon = activeGroup.icon;
  const isDark = useColorScheme() === "dark";
  const canSwitch = availableGroups.length > 1;

  if (!activeRole || availableGroups.length === 0) return null;

  return (
    <Host matchContents>
      <Pressable
        onPress={() => {
          if (canSwitch) setIsOpen(true);
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSwitch }}
        className="flex-row items-center gap-3 rounded-2xl bg-white p-3 pr-4 dark:bg-gray-900"
      >
        {isDark ? (
          <BlurView
            intensity={DARK_ICON_BLUR_INTENSITY}
            tint="dark"
            style={styles.darkIconContainer}
          >
            <ActiveIcon size={20} color="#ffffff" />
          </BlurView>
        ) : (
          <View className="size-10 items-center justify-center rounded-xl bg-green-50">
            <ActiveIcon size={20} color="#0d542b" />
          </View>
        )}

        <View className="min-w-0 flex-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">{t("active_dashboard")}</Text>
          <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50" numberOfLines={1}>
            {t(activeGroup.titleKey)}
          </Text>
        </View>

        {canSwitch ? <ChevronDown size={20} color="#6a7282" /> : null}
      </Pressable>

      {isOpen && (
        <ModalBottomSheet containerColor="#ffffff" onDismissRequest={() => setIsOpen(false)}>
          <RNHostView matchContents>
            <View className="px-4 pb-4" style={{ width: sheetWidth }}>
              <View className="flex-row items-center justify-center border-b border-gray-200 pb-4">
                <Text className="text-sm font-medium text-gray-950">{t("switch_dashboard")}</Text>
              </View>

              <View className="flex-col">
                {availableGroups.map((group, index) => {
                  const Icon = group.icon;
                  const selected = group.id === activeId;

                  return (
                    <Pressable
                      key={group.id}
                      onPress={() => {
                        setActiveDashboardGroup(group.id);
                        setIsOpen(false);
                      }}
                      className={`flex-row items-start gap-3 border-t py-3 ${
                        index === 0 ? "border-transparent" : "border-gray-100"
                      }`}
                    >
                      {selected && isDark ? (
                        <BlurView
                          intensity={DARK_ICON_BLUR_INTENSITY}
                          tint="dark"
                          style={styles.darkIconContainer}
                        >
                          <Icon size={20} color="#ffffff" />
                        </BlurView>
                      ) : (
                        <View
                          className={`size-10 items-center justify-center rounded-xl ${
                            selected ? "bg-green-50" : "bg-gray-100 dark:bg-gray-800"
                          }`}
                        >
                          <Icon
                            size={20}
                            color={selected ? "#0d542b" : isDark ? "#9ca3af" : "#6a7282"}
                          />
                        </View>
                      )}

                      <View className="min-w-0 flex-1 gap-2">
                        <View className="flex-row items-center gap-2">
                          <Text
                            className={`flex-1 text-sm font-semibold ${
                              selected ? "text-green-900" : "text-gray-950"
                            }`}
                            numberOfLines={1}
                          >
                            {t(group.titleKey)}
                          </Text>
                          {group.readOnly ? (
                            <View className="flex-none rounded-full bg-gray-100 px-2 py-0.5">
                              <Text className="text-[10px] font-medium text-gray-500 uppercase">
                                {t("read_only")}
                              </Text>
                            </View>
                          ) : null}
                          {selected ? (
                            <View className="size-6 flex-none items-center justify-center rounded-full bg-green-900">
                              <Check size={14} color="#ffffff" />
                            </View>
                          ) : null}
                        </View>

                        <Text className="text-xs text-gray-500">{t(group.subtitleKey)}</Text>

                        <View className="flex-row flex-wrap gap-1.5">
                          {group.roles.map((role) => (
                            <View
                              key={role}
                              className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5"
                            >
                              <Text className="text-[11px] font-medium text-green-800">{role}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </RNHostView>
        </ModalBottomSheet>
      )}
    </Host>
  );
}
