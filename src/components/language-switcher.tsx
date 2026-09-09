import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { Check } from "lucide-react-native";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import i18n from "@/src/i18n";
import { type Language, usePreferences } from "@/src/providers/preference-context";

type LanguageOption = {
  code: Language;
  flag: string;
};

const languages: LanguageOption[] = [
  { code: "en", flag: "https://flagcdn.com/h40/gb.png" },
  { code: "sw", flag: "https://flagcdn.com/h40/tz.png" },
];

const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: sheetWidth } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { languageMutation, language } = usePreferences();

  const flagPath = languages.find((lang) => lang.code === language)?.flag;

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        className="inline-flex w-22 flex-row items-center justify-center gap-1.5 rounded-md bg-gray-100 p-1 px-2 py-1 dark:bg-gray-800"
      >
        <Image className="h-3 w-4 rounded-xs" source={{ uri: flagPath }} />
        <Text className="text-sm text-gray-600 dark:text-gray-100">{t("change")}</Text>
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#ffffff" }}
      >
        <BottomSheetView style={{ width: sheetWidth, paddingBottom: insets.bottom }}>
          <View className="flex flex-col gap-2 p-5">
            <Text className="text-lg font-bold text-gray-950">{t("change_language")}</Text>

            <View className="mt-4">
              {languages.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => {
                    languageMutation.mutate({ language: lang.code });
                    i18n.changeLanguage(lang.code);
                    sheetRef.current?.dismiss();
                  }}
                  className="flex flex-row items-center justify-between gap-4 border-t border-gray-200 py-3"
                >
                  <View className="flex flex-1 flex-row items-center gap-2">
                    <Image className="h-3 w-4" source={{ uri: lang.flag }} />
                    <Text className="text-sm font-normal text-gray-700 uppercase">
                      {t(`language_${lang.code}`)}
                    </Text>
                  </View>

                  <View
                    className={`flex items-center justify-center rounded-full p-1.5 ${
                      language === lang.code ? "bg-green-600" : "bg-transparent"
                    }`}
                  >
                    <Check
                      size={15}
                      strokeWidth={3}
                      color={language === lang.code ? "#ffffff" : "transparent"}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

export default LanguageSwitcher;
