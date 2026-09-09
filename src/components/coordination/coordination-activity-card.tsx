import { Link } from "expo-router";
import { ChevronRight, MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import {
  activityStatusLabelKey,
  activityStatusSurfaceClass,
  activityStatusTextClass,
  activityTypeColor,
  activityTypeIcon,
  activityTypeLabelKey,
  activityTypeSurfaceClass,
  activityTypeTextClass,
} from "@/src/components/coordination/coordination-visuals";
import { type CoordinationActivity } from "@/src/data/coordination";

export default function CoordinationActivityCard({ activity }: { activity: CoordinationActivity }) {
  const { t } = useTranslation();
  const TypeIcon = activityTypeIcon[activity.type];

  return (
    <Link href={`/(protected)/(app)/coordination/${activity.id}`} asChild push>
      <Pressable className="border-b border-gray-200 py-4 active:opacity-70 dark:border-gray-800">
        <View className="flex-1 gap-3">
          <View className="flex-row items-start gap-3">
            <View
              className={`size-10 items-center justify-center rounded-xl border-continuous ${activityTypeSurfaceClass[activity.type]}`}
            >
              <TypeIcon size={19} color={activityTypeColor[activity.type]} />
            </View>
            <View className="flex-1 gap-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className={`flex-1 text-xs font-semibold ${activityTypeTextClass[activity.type]}`}
                  numberOfLines={1}
                >
                  {t(activityTypeLabelKey[activity.type])}
                </Text>
                <View
                  className={`rounded-full px-2 py-0.5 ${activityStatusSurfaceClass[activity.status]}`}
                >
                  <Text
                    className={`text-[11px] font-semibold ${activityStatusTextClass[activity.status]}`}
                  >
                    {t(activityStatusLabelKey[activity.status])}
                  </Text>
                </View>
              </View>
              <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
                {activity.title}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {activity.department}
              </Text>
            </View>
            <ChevronRight size={18} color="#6a7282" />
          </View>

          <View className="gap-2 pl-[52px]">
            <View className="flex-row items-center gap-1.5">
              <MapPin size={14} color="#6a7282" />
              <Text className="flex-1 text-xs text-gray-600 dark:text-gray-300" numberOfLines={1}>
                {activity.location}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
