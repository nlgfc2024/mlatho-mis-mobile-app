import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { CalendarRange, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CoordinationActivityCard from "@/src/components/coordination/coordination-activity-card";
import { parseCalendarDate, type CoordinationActivity } from "@/src/data/coordination";

type CoordinationDateSheetProps = {
  visible: boolean;
  date: string;
  activities: CoordinationActivity[];
  onClose: () => void;
};

export default function CoordinationDateSheet({
  visible,
  date,
  activities,
  onClose,
}: CoordinationDateSheetProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const bottomGuard = Math.max(insets.bottom, 32);

  if (!visible) return null;

  const parsed = parseCalendarDate(date);

  return (
    <Host matchContents>
      <ModalBottomSheet
        containerColor={isDark ? "#030712" : "#ffffff"}
        contentColor={isDark ? "#f9fafb" : "#111827"}
        scrimColor="rgba(0, 0, 0, 0.36)"
        onDismissRequest={onClose}
        showDragHandle={false}
        skipPartiallyExpanded
      >
        <RNHostView matchContents>
          <View
            className="bg-white dark:bg-gray-950"
            style={{
              width: Math.min(width, 640),
              height: Math.max(240, height * 0.5 - bottomGuard),
            }}
          >
            <View className="items-center py-3">
              <View className="h-1 w-9 rounded-full bg-gray-700 dark:bg-gray-300" />
            </View>

            <View className="flex-row items-start justify-between gap-4 border-b border-gray-200 px-5 pb-4 dark:border-gray-800">
              <View className="flex-1 gap-1">
                <Text className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                  {parsed.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t("coordination_activity_count", { count: activities.length })}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} className="p-1">
                <X size={21} color="#6a7282" />
              </Pressable>
            </View>

            <View className="flex-1 overflow-hidden">
              <ScrollView
                nestedScrollEnabled
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: bottomGuard + 16,
                }}
              >
                {activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <Animated.View
                      key={activity.id}
                      entering={FadeInUp.duration(200).delay(Math.min(index * 35, 140))}
                    >
                      <CoordinationActivityCard activity={activity} />
                    </Animated.View>
                  ))
                ) : (
                  <View className="items-center gap-3 px-6 py-12">
                    <CalendarRange size={26} color="#9ca3af" />
                    <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("coordination_no_activities_for_day")}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View
              pointerEvents="none"
              className="absolute right-0 bottom-0 left-0 bg-white dark:bg-gray-950"
              style={{ zIndex: 100, height: bottomGuard }}
            />
          </View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
