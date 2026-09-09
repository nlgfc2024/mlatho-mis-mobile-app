import { clsx } from "clsx";
import { TextInput, type TextInputProps, useColorScheme, View } from "react-native";

import { useWhitespaceNormalizedTextInput } from "./normalize-whitespace";

type ComponentProps = TextInputProps;

const Textarea: React.FC<ComponentProps> = ({
  className,
  onBlur,
  onChangeText,
  placeholderTextColor,
  textAlignVertical = "top",
  value,
  ...props
}) => {
  const isDark = useColorScheme() === "dark";
  const { handleBlur, handleChangeText } = useWhitespaceNormalizedTextInput({
    multiline: true,
    onBlur,
    onChangeText,
    value,
  });

  return (
    <View className="min-h-[120] rounded-xl border border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
      <TextInput
        {...props}
        value={value}
        multiline={true}
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        className={clsx("flex-1 px-4 py-3 text-sm text-gray-950 dark:text-gray-50", className)}
        placeholderTextColor={placeholderTextColor ?? (isDark ? "#9ca3af" : "#6b7280")}
        textAlignVertical={textAlignVertical}
        underlineColorAndroid="transparent"
      />
    </View>
  );
};

export default Textarea;
