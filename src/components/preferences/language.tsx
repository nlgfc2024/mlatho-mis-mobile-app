import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, Text, useColorScheme, useWindowDimensions, View } from "react-native";

import {
  ACCOUNT_CARET_SIZE,
  getAccountCaretColor,
} from "@/src/components/account/account-section-tokens";
import { type Language, usePreferences } from "@/src/providers/preference-context";

type LanguageOption = {
  code: Language;
  flag: string;
};

const languages: LanguageOption[] = [
  { code: "en", flag: "https://flagcdn.com/h40/gb.png" },
  { code: "sw", flag: "https://flagcdn.com/h40/tz.png" },
];

export default function AccountLanguagePreference() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { width: sheetWidth } = useWindowDimensions();
  const { languageMutation, language } = usePreferences();
  const isDark = useColorScheme() === "dark";
  const iconColor = isDark ? "#9ca3af" : "#4a5565";
  const caretColor = getAccountCaretColor(isDark);
  const sheetContainerColor = isDark ? "#111827" : "#ffffff";

  const flagPath = languages.find((lang) => lang.code === language)?.flag;

  return (
    <Host matchContents>
      <View className="flex flex-row items-center justify-between gap-4 bg-white px-4 py-4 dark:bg-gray-900">
        <View className="flex min-w-0 flex-1 flex-row items-center gap-3">
          <View className="size-10 flex-none items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <MaterialIcons name="translate" size={20} color={iconColor} />
          </View>

          <View className="min-w-0 flex-1">
            <Text className="text-base font-normal text-gray-950 dark:text-gray-100">
              {t("language")}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {t("language_description")}
            </Text>
          </View>
        </View>

        <Pressable onPress={() => setIsOpen(true)} className="flex flex-row items-center gap-1">
          <View className="flex flex-row items-center gap-2">
            <Image className="h-3 w-4 rounded-xs" source={{ uri: flagPath }} />
            <Text className="text-sm font-medium text-gray-950 uppercase dark:text-gray-100">
              {language}
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={ACCOUNT_CARET_SIZE} color={caretColor} />
        </Pressable>
      </View>

      {isOpen && (
        <ModalBottomSheet
          containerColor={sheetContainerColor}
          onDismissRequest={() => setIsOpen(false)}
        >
          <RNHostView matchContents>
            <View className="bg-white px-4 pb-4 dark:bg-gray-900" style={{ width: sheetWidth }}>
              <View className="flex flex-row items-center justify-center border-b border-gray-200 pb-4 dark:border-gray-800">
                <Text className="text-sm font-medium text-gray-950 dark:text-gray-100">
                  {t("select_language")}
                </Text>
              </View>

              <View className="flex flex-col">
                {languages.map((lang, index) => (
                  <Pressable
                    key={lang.code}
                    onPress={() => {
                      languageMutation.mutate({ language: lang.code });
                      setIsOpen(false);
                    }}
                    className={`flex flex-row items-center justify-between gap-4 border-t py-4 ${
                      index === 0 ? "border-transparent" : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <View className="flex flex-1 flex-row items-center gap-2">
                      <Image className="h-3 w-4" source={{ uri: lang.flag }} />
                      <Text className="text-sm font-medium tracking-wide text-gray-700 uppercase dark:text-gray-300">
                        {t(`language_${lang.code}`)}
                      </Text>
                    </View>

                    <View className="flex-none">
                      <View
                        className={`flex items-center justify-center rounded-full p-1 ${
                          language === lang.code
                            ? "border-2 border-gray-700 dark:border-gray-100"
                            : "border-2 border-gray-500 bg-transparent dark:border-gray-600"
                        }`}
                      >
                        <View
                          className={`size-3 rounded-full ${language === lang.code ? "bg-gray-700 dark:bg-gray-100" : ""}`}
                        />
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
