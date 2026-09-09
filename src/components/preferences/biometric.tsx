import { Host, Switch } from "@expo/ui/jetpack-compose";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert, Text, useColorScheme, View } from "react-native";

import { useSession } from "@/src/providers/session-context";

export default function AccountBiometricPreference() {
  const { t } = useTranslation();
  const {
    biometricLabel,
    disableBiometricAuthentication,
    enableBiometricAuthentication,
    isBiometricEnabled,
  } = useSession();

  const isPending =
    enableBiometricAuthentication.isPending || disableBiometricAuthentication.isPending;
  const description = isBiometricEnabled
    ? t("biometric_enabled_description", { label: biometricLabel ?? t("biometrics") })
    : t("biometric_disabled_description");
  const iconColor = useColorScheme() === "dark" ? "#9ca3af" : "#4a5565";

  const handleCheckedChange = (checked: boolean) => {
    if (isPending || checked === isBiometricEnabled) return;

    if (checked) {
      enableBiometricAuthentication.mutate(undefined, {
        onError: (error) => {
          Alert.alert(t("biometric_unavailable"), error.message);
        },
      });
      return;
    }

    disableBiometricAuthentication.mutate(undefined, {
      onError: (error) => {
        Alert.alert(t("biometric_settings"), error.message);
      },
    });
  };

  return (
    <View className="flex flex-row items-center justify-between gap-4 bg-white px-4 py-4 dark:bg-gray-900">
      <View className="flex min-w-0 flex-1 flex-row items-center gap-3">
        <View className="size-10 flex-none items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          {isBiometricEnabled ? (
            <MaterialIcons name="verified-user" size={20} color="#15803d" />
          ) : (
            <MaterialIcons name="fingerprint" size={20} color={iconColor} />
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-base font-normal text-gray-950 dark:text-gray-100">
            {t("biometric_unlock")}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {description}
          </Text>
        </View>
      </View>

      <Host matchContents>
        <Switch
          value={isBiometricEnabled}
          enabled={!isPending}
          colors={{ checkedTrackColor: "#15803d" }}
          onCheckedChange={handleCheckedChange}
        />
      </Host>
    </View>
  );
}
