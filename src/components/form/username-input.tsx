import { clsx } from "clsx";
import { UserRound } from "lucide-react-native";
import { TextInput, type TextInputProps, View } from "react-native";

import { usePreferences } from "@/src/providers/preference-context";

import { useWhitespaceNormalizedTextInput } from "./normalize-whitespace";

type ComponentProps = TextInputProps;

const UsernameInput: React.FC<ComponentProps> = ({ className, onBlur, onChangeText, ...props }) => {
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
        className={clsx(
          "rounded-xl border border-gray-100 bg-gray-100 px-9 py-3 text-sm text-gray-950 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50",
          className,
        )}
        placeholderTextColor={theme === "dark" ? "#9ca3af" : "#6b7280"}
      />

      <View className="absolute inset-y-0 left-0 flex flex-row items-center px-3">
        <UserRound size={16} color={theme === "dark" ? "#99a1af" : "#6b7280"} strokeWidth={2.25} />
      </View>
    </View>
  );
};

export default UsernameInput;
