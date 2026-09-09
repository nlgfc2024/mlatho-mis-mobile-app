import React from "react";
import { Text, View } from "react-native";

interface ComponentProps {
  errors: ({ message?: string } | string | undefined)[];
}

const ErrorMessage: React.FC<ComponentProps> = ({ errors }) => {
  const messages = errors
    .map((error) => {
      if (!error) return null;
      if (typeof error === "string") return error;
      return error.message ?? null;
    })
    .filter(Boolean)
    .join(", ");

  return (
    <View>
      <Text className="text-sm font-normal text-red-500 dark:text-red-400">{messages}</Text>
    </View>
  );
};

export default ErrorMessage;
