import { clsx } from "clsx";
import { Search, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TextInput, TextInputProps, useColorScheme, View } from "react-native";

import { normalizeWhitespace } from "./normalize-whitespace";

interface SearchInputProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  value?: string;
  onChangeText?: (text: string) => void;
  onCancel?: () => void;
}

export default function SearchInput({
  value: controlledValue,
  className,
  onBlur,
  onChangeText,
  onCancel,
  placeholderTextColor,
  ...props
}: SearchInputProps) {
  const { t } = useTranslation();
  const [internalValue, setInternalValue] = useState("");
  const isDark = useColorScheme() === "dark";
  const iconColor = isDark ? "#9ca3af" : "#4a5565";

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const latestTextRef = useRef(value);

  useEffect(() => {
    latestTextRef.current = value;
  }, [value]);

  const handleChange = (text: string) => {
    const normalizedText = normalizeWhitespace(text);

    latestTextRef.current = normalizedText;
    if (!isControlled) {
      setInternalValue(normalizedText);
    }
    onChangeText?.(normalizedText);
  };

  const handleBlur: TextInputProps["onBlur"] = (event) => {
    const normalizedText = normalizeWhitespace(latestTextRef.current, { trim: true });

    latestTextRef.current = normalizedText;
    if (!isControlled) {
      setInternalValue(normalizedText);
    }
    onChangeText?.(normalizedText);
    onBlur?.(event);
  };

  const handleClear = () => {
    latestTextRef.current = "";

    if (!isControlled) {
      setInternalValue("");
    }
    onChangeText?.("");
  };

  return (
    <View className="flex flex-row items-stretch justify-between gap-2">
      <View className="relative flex-1">
        <TextInput
          {...props}
          value={value}
          onBlur={handleBlur}
          onChangeText={handleChange}
          className={clsx(
            "rounded-full bg-gray-100 px-9 text-sm text-gray-950 dark:bg-gray-900 dark:text-gray-50",
            className,
          )}
          placeholderTextColor={placeholderTextColor ?? (isDark ? "#9ca3af" : "#6b7280")}
          autoCapitalize="none"
          enterKeyHint="search"
          inputMode="search"
          returnKeyType="search"
        />

        {/* Search Icon */}
        <View className="absolute inset-y-0 left-0 flex-row items-center px-3">
          <Search size={16} color={iconColor} strokeWidth={2.5} />
        </View>

        {/* Clear Icon */}
        {value.length > 0 && (
          <View className="absolute inset-y-0 right-0 flex-row items-center px-2">
            <Pressable
              onPress={handleClear}
              className="rounded-full bg-gray-200 p-1 dark:bg-gray-800"
            >
              <X size={14} color={isDark ? "#d1d5db" : "#6b7280"} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Cancel Button */}
      {value.length > 0 && (
        <Pressable onPress={onCancel} className="flex flex-row items-center justify-center px-2">
          <Text className="text-sm font-medium text-blue-600 dark:text-blue-300">
            {t("cancel")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
