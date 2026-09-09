import { CloudSync, TriangleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from "react-native";

interface PendingSyncBannerProps {
  /** Localized message describing what is waiting to sync. */
  message: string;
  /** Whether a sync is currently in progress. */
  isSyncing: boolean;
  /** Triggered when the user taps the synchronize button. */
  onSync: () => void;
}

/**
 * Shared warning banner shown when local records are pending upload. Callers own
 * the query + mutation logic and pass the message and sync handler; this keeps
 * the visual style consistent across every module (grievance, PWP, case
 * management, community session, ...).
 */
export default function PendingSyncBanner({ message, isSyncing, onSync }: PendingSyncBannerProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  return (
    <View className="flex flex-row items-center justify-between gap-4 bg-yellow-100 px-5 py-2 dark:bg-yellow-950">
      <View className="flex flex-1 flex-row items-center gap-2">
        <TriangleAlert size={16} color={isDark ? "#fde68a" : "#92400e"} strokeWidth={2.25} />
        <Text className="text-sm font-normal text-yellow-800 dark:text-yellow-100">{message}</Text>
      </View>

      <View className="flex-none">
        <Pressable
          disabled={isSyncing}
          onPress={onSync}
          className="flex flex-row items-center rounded-full bg-yellow-950 px-1 py-1 dark:bg-yellow-200"
        >
          {isSyncing ? (
            <ActivityIndicator color={isDark ? "#713f12" : "#fff"} />
          ) : (
            <View className="pl-1">
              <CloudSync size={16} color={isDark ? "#713f12" : "#fefce8"} strokeWidth={2.25} />
            </View>
          )}

          <View className="px-2">
            <Text className="text-sm font-medium text-yellow-50 dark:text-yellow-950">
              {isSyncing ? t("synchronizing") : t("synchronize")}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
