import { CalendarRange, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

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
  const insets = useSafeAreaInsets();
  const parsed = parseCalendarDate(date);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/35" onPress={onClose}>
        <Pressable
          className="max-h-[72%] rounded-t-3xl bg-white pt-4 dark:bg-gray-950"
          onPress={(event) => event.stopPropagation()}
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-row items-start justify-between gap-4 border-b border-gray-200 px-5 pb-4 dark:border-gray-800">
            <View className="flex-1 gap-1">
              <Text selectable className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                {parsed.toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Text selectable className="text-xs text-gray-500 dark:text-gray-400">
                {t("coordination_activity_count", { count: activities.length })}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} className="p-1">
              <X size={21} color="#6a7282" />
            </Pressable>
          </View>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerClassName="px-5 pb-4"
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
                <Text selectable className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t("coordination_no_activities_for_day")}
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
