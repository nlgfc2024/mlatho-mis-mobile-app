import { Fingerprint, LogOut } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, Text, View } from "react-native";

import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { useSession } from "@/src/providers/session-context";

export default function BiometricLockScreen() {
  const { t } = useTranslation();
  const { biometricUnlock, logout, user } = useSession();
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (hasPrompted.current) return;

    hasPrompted.current = true;
    biometricUnlock.mutate();
  }, [biometricUnlock]);

  const isBusy = biometricUnlock.isPending || logout.isPending;
  const displayName = user?.username ?? user?.email ?? t("your_account");

  return (
    <StyledSafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-1 justify-between p-4">
        <View className="items-center justify-end">
          <Image className="size-24" source={require("@/assets/images/logo.png")} />
        </View>

        <View className="gap-6">
          <View className="items-center gap-4">
            <View className="size-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
              <Fingerprint size={34} color="#15803d" />
            </View>

            <View className="items-center gap-2">
              <Text className="text-2xl font-bold text-gray-950 dark:text-gray-50">
                {t("unlock_tasaf")}
              </Text>
              <Text className="text-center text-base text-gray-600 dark:text-gray-300">
                {t("use_biometrics_to_continue", { name: displayName })}
              </Text>
            </View>
          </View>

          {biometricUnlock.isError && (
            <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-center text-sm text-red-700">
                {biometricUnlock.error.message}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-3">
          <Pressable
            disabled={isBusy}
            onPress={() => biometricUnlock.mutate()}
            className="h-12 items-center justify-center rounded-full bg-green-700 px-4 active:bg-green-800 disabled:opacity-60"
          >
            <Text className="text-base font-semibold text-white">
              {biometricUnlock.isPending ? t("unlocking") : t("unlock_with_biometrics")}
            </Text>
          </Pressable>

          <Pressable
            disabled={isBusy}
            onPress={() => logout.mutate({})}
            className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-red-50 px-4 active:bg-red-100 disabled:opacity-60"
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="text-base font-semibold text-red-600">
              {t("use_password_instead")}
            </Text>
          </Pressable>
        </View>
      </View>
    </StyledSafeAreaView>
  );
}
