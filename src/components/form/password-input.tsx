import { clsx } from "clsx";
import { Lock } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TextInput, type TextInputProps, View } from "react-native";

import { usePreferences } from "@/src/providers/preference-context";

import { useWhitespaceNormalizedTextInput } from "./normalize-whitespace";

type ComponentProps = TextInputProps;

const PasswordInput: React.FC<ComponentProps> = ({ className, onBlur, onChangeText, ...props }) => {
  const { t } = useTranslation();
  const [isHidden, setIsHidden] = useState(true);
  const { theme } = usePreferences();

  const { handleBlur, handleChangeText } = useWhitespaceNormalizedTextInput({
    onBlur,
    onChangeText,
    value: props.value,
  });

  return (
    <View className="relative">
      <TextInput
        {...props}
        autoCapitalize="none"
        autoCorrect={false}
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        secureTextEntry={isHidden}
        className={clsx(
          "rounded-xl border border-gray-100 bg-gray-100 px-9 py-3 text-sm text-gray-950 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50",
          className,
        )}
        placeholderTextColor={theme === "dark" ? "#9ca3af" : "#6b7280"}
      />

      <View className="absolute inset-y-0 left-0 flex flex-row items-center px-3">
        <Lock size={16} color={theme === "dark" ? "#99a1af" : "#6b7280"} strokeWidth={2.25} />
      </View>

      <Pressable
        onPress={() => setIsHidden((state) => !state)}
        className="absolute inset-y-0 right-0 flex flex-row items-center px-4"
      >
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isHidden ? t("show") : t("hide")}
        </Text>
      </Pressable>
    </View>
  );
};

export default PasswordInput;
