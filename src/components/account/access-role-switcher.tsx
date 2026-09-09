import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { Check, ChevronDown, RefreshCw, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  type StyleProp,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";

import { useSession } from "@/src/providers/session-context";

import {
  ACCOUNT_CARET_SIZE,
  ACCOUNT_CARET_STROKE_WIDTH,
  getAccountCaretColor,
} from "./account-section-tokens";

type AccessRoleSwitcherProps = {
  containerStyle?: StyleProp<ViewStyle>;
};

export default function AccessRoleSwitcher({ containerStyle }: AccessRoleSwitcherProps) {
  const { t } = useTranslation();
  const { width: sheetWidth } = useWindowDimensions();
  const cardWidth = Math.max(0, sheetWidth - 32);
  const isDark = useColorScheme() === "dark";
  const caretColor = getAccountCaretColor(isDark);
  const [isOpen, setIsOpen] = useState(false);
  const {
    accessProfile,
    activeRole,
    isAccessProfileLoading,
    accessProfileError,
    refetchAccessProfile,
    switchRole,
  } = useSession();

  const roles =
    accessProfile?.user?.iUser?.roles?.filter((role): role is NonNullable<typeof role> =>
      Boolean(role?.id && !role.isBlocked),
    ) ?? [];
  const canSwitch = roles.length > 1;

  if (isAccessProfileLoading && !accessProfile) {
    return (
      <View
        className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-4 dark:bg-gray-900"
        style={[{ width: cardWidth }, containerStyle]}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <RefreshCw size={20} color={isDark ? "#9ca3af" : "#6a7282"} />
        </View>
        <Text className="text-base font-normal text-gray-500 dark:text-gray-400">
          {t("loading_roles")}
        </Text>
      </View>
    );
  }

  if (accessProfileError && !accessProfile) {
    return (
      <Pressable
        onPress={() => void refetchAccessProfile()}
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-4 dark:bg-gray-900"
        style={[{ width: cardWidth }, containerStyle]}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950">
          <RefreshCw size={20} color="#b91c1c" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-normal text-gray-950 dark:text-gray-50">
            {t("roles_unavailable")}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{t("tap_to_retry")}</Text>
        </View>
      </Pressable>
    );
  }

  if (!activeRole) return null;

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Pressable
        onPress={() => {
          if (canSwitch) setIsOpen(true);
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSwitch }}
        className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-4 dark:bg-gray-900"
        style={[{ width: cardWidth }, containerStyle]}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950">
          <ShieldCheck size={20} color={isDark ? "#bbf7d0" : "#0d542b"} />
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">{t("active_role")}</Text>
          <Text className="text-base font-normal text-gray-950 dark:text-gray-50" numberOfLines={1}>
            {activeRole.name}
          </Text>
        </View>

        {canSwitch ? (
          <ChevronDown
            size={ACCOUNT_CARET_SIZE}
            strokeWidth={ACCOUNT_CARET_STROKE_WIDTH}
            color={caretColor}
          />
        ) : null}
      </Pressable>

      {isOpen && (
        <ModalBottomSheet
          containerColor={isDark ? "#111827" : "#ffffff"}
          onDismissRequest={() => setIsOpen(false)}
          skipPartiallyExpanded
        >
          <RNHostView matchContents>
            <View className="px-4 pb-4" style={{ width: sheetWidth }}>
              <View className="flex-row items-center justify-center border-b border-gray-200 pb-4 dark:border-gray-700">
                <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                  {t("switch_role")}
                </Text>
              </View>

              <View className="flex-col">
                {roles.map((role, index) => {
                  const selected = role.id === activeRole.id;
                  return (
                    <Pressable
                      key={role.uuid || role.id}
                      onPress={() => {
                        switchRole(role.id);
                        setIsOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      className={`flex-row items-center gap-3 border-t py-4 ${
                        index === 0 ? "border-transparent" : "border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      <View
                        className={`size-10 items-center justify-center rounded-xl ${
                          selected
                            ? "bg-green-50 dark:bg-green-950"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <ShieldCheck
                          size={20}
                          color={selected ? (isDark ? "#bbf7d0" : "#0d542b") : "#6a7282"}
                        />
                      </View>

                      <Text
                        className={`min-w-0 flex-1 text-sm font-semibold ${
                          selected
                            ? "text-green-900 dark:text-green-100"
                            : "text-gray-950 dark:text-gray-50"
                        }`}
                        numberOfLines={2}
                      >
                        {role.name}
                      </Text>

                      {selected ? (
                        <View className="size-6 items-center justify-center rounded-full bg-green-900">
                          <Check size={14} color="#ffffff" />
                        </View>
                      ) : null}
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
