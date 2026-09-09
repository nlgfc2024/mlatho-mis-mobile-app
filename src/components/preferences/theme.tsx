import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, useWindowDimensions, View } from "react-native";

import {
  ACCOUNT_CARET_SIZE,
  getAccountCaretColor,
} from "@/src/components/account/account-section-tokens";
import { translateTheme } from "@/src/i18n/helpers";
import { type Theme, usePreferences } from "@/src/providers/preference-context";

type ThemeOption = {
  name: Theme;
  iconName: React.ComponentProps<typeof MaterialIcons>["name"];
};

const themes: ThemeOption[] = [
  {
    name: "light",
    iconName: "light-mode",
  },
  {
    name: "dark",
    iconName: "dark-mode",
  },
  {
    name: "system",
    iconName: "settings-brightness",
  },
];

export default function AccountThemePreference() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { width: sheetWidth } = useWindowDimensions();
  const { theme, themeMutation } = usePreferences();
  const isDark = useColorScheme() === "dark";
  const iconColor = isDark ? "#9ca3af" : "#4a5565";
  const caretColor = getAccountCaretColor(isDark);
  const sheetContainerColor = isDark ? "#111827" : "#ffffff";

  return (
    <Host matchContents>
      <View className="flex flex-row items-center justify-between gap-4 border-t border-transparent bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        <View className="flex min-w-0 flex-1 flex-row items-center gap-3">
          <View className="size-10 flex-none items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <MaterialIcons name="palette" size={20} color={iconColor} />
          </View>

          <View className="min-w-0 flex-1">
            <Text className="text-base font-normal text-gray-950 dark:text-gray-100">
              {t("theme")}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {t("theme_description")}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setIsOpen(true)}
          className="flex flex-none flex-row items-center gap-1"
        >
          <Text className="text-left text-sm font-medium text-gray-950 dark:text-gray-100">
            {translateTheme(t, theme)}
          </Text>

          <MaterialIcons name="chevron-right" size={ACCOUNT_CARET_SIZE} color={caretColor} />
        </Pressable>
      </View>

      {isOpen && (
        <ModalBottomSheet
          containerColor={sheetContainerColor}
          onDismissRequest={() => setIsOpen(false)}
        >
          <RNHostView matchContents>
            <View className="bg-white px-4 pb-5 dark:bg-gray-900" style={{ width: sheetWidth }}>
              <View className="flex flex-row items-center justify-center border-b border-gray-200 pb-4 dark:border-gray-800">
                <Text className="text-sm font-medium text-gray-950 dark:text-gray-100">
                  {t("select_theme")}
                </Text>
              </View>

              <View className="flex flex-col">
                {themes.map((themeItem, index) => (
                  <Pressable
                    key={themeItem.name}
                    onPress={() => {
                      themeMutation.mutate({ theme: themeItem.name });
                      setIsOpen(false);
                    }}
                    className={`border-t py-4 ${
                      index === 0 ? "border-transparent" : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <View className="flex flex-row items-center justify-between gap-4">
                      <View className="flex flex-1 flex-row items-center gap-2">
                        <MaterialIcons name={themeItem.iconName} size={20} color={caretColor} />

                        <View>
                          <Text className="text-base font-normal text-gray-700 dark:text-gray-300">
                            {translateTheme(t, themeItem.name)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-none">
                        <View
                          className={`flex items-center justify-center rounded-full p-1 ${
                            theme === themeItem.name
                              ? "border-2 border-gray-700 dark:border-gray-100"
                              : "border-2 border-gray-500 bg-transparent dark:border-gray-600"
                          }`}
                        >
                          <View
                            className={`size-3 rounded-full ${theme === themeItem.name ? "bg-gray-700 dark:bg-gray-100" : ""}`}
                          />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </RNHostView>
        </ModalBottomSheet>
      )}
    </Host>
  );
}
