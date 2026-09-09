import { Host, Switch } from "@expo/ui/jetpack-compose";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, useColorScheme, View } from "react-native";

import { usePreferences } from "@/src/providers/preference-context";

export default function AccountNotificationPreference() {
  const { t } = useTranslation();
  const { notificationMutation, notifications } = usePreferences();
  const isPending = notificationMutation.isPending;
  const iconColor = useColorScheme() === "dark" ? "#9ca3af" : "#4a5565";

  const handleCheckedChange = (checked: boolean) => {
    if (isPending || checked === notifications) return;
    notificationMutation.mutate({ notifications: checked });
  };

  return (
    <View className="flex flex-row items-center justify-between gap-4 bg-white px-4 py-4 dark:bg-gray-900">
      <View className="flex min-w-0 flex-1 flex-row items-center gap-3">
        <View className="size-10 flex-none items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <MaterialIcons
            name={notifications ? "notifications" : "notifications-off"}
            size={20}
            color={iconColor}
          />
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-base font-normal text-gray-950 dark:text-gray-100">
            {t("notifications")}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {t("notifications_description")}
          </Text>
        </View>
      </View>

      <View>
        <Host matchContents>
          <Switch
            value={notifications}
            enabled={!isPending}
            colors={{ checkedTrackColor: "#15803d" }}
            onCheckedChange={handleCheckedChange}
          />
        </Host>
      </View>
    </View>
  );
}
