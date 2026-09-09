import { useEffect, useRef } from "react";
import type { TextInputProps } from "react-native";

export function normalizeWhitespace(
  text: string,
  options: { multiline?: boolean; trim?: boolean } = {},
) {
  const normalized = options.multiline
    ? text
        .replace(/\r\n?/g, "\n")
        .replace(/[^\S\n]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
    : text.replace(/\s+/g, " ");

  if (options.trim) {
    return normalized.trim();
  }

  return normalized.replace(/^\s+/, "");
}

export function useWhitespaceNormalizedTextInput({
  multiline,
  onBlur,
  onChangeText,
  value,
}: {
  multiline?: boolean;
  onBlur?: TextInputProps["onBlur"];
  onChangeText?: TextInputProps["onChangeText"];
  value?: TextInputProps["value"];
}) {
  const latestTextRef = useRef(typeof value === "string" ? value : "");

  useEffect(() => {
    if (typeof value === "string") {
      latestTextRef.current = value;
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    const normalizedText = normalizeWhitespace(text, { multiline });

    latestTextRef.current = normalizedText;
    onChangeText?.(normalizedText);
  };

  const handleBlur: TextInputProps["onBlur"] = (event) => {
    const normalizedText = normalizeWhitespace(latestTextRef.current, { multiline, trim: true });

    latestTextRef.current = normalizedText;
    onChangeText?.(normalizedText);
    onBlur?.(event);
  };

  return { handleBlur, handleChangeText };
}
