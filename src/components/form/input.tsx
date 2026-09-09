import { clsx } from "clsx";
import { TextInput, useColorScheme, type TextInputProps } from "react-native";

import { useWhitespaceNormalizedTextInput } from "./normalize-whitespace";

type ComponentProps = TextInputProps;

const Input: React.FC<ComponentProps> = ({
  className,
  onBlur,
  onChangeText,
  placeholderTextColor,
  value,
  ...props
}) => {
  const isDark = useColorScheme() === "dark";
  const { handleBlur, handleChangeText } = useWhitespaceNormalizedTextInput({
    onBlur,
    onChangeText,
    value,
  });

  return (
    <TextInput
      {...props}
      value={value}
      onBlur={handleBlur}
      onChangeText={handleChangeText}
      placeholderTextColor={placeholderTextColor ?? (isDark ? "#9ca3af" : "#6b7280")}
      className={clsx(
        "rounded-xl border border-gray-100 bg-gray-100 px-4 py-3 text-sm text-gray-950 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50",
        className,
      )}
    />
  );
};

export default Input;
