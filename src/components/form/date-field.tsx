import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Calendar } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";

import { useFieldContext } from "@/src/providers/form-context";

import ErrorMessage from "./error-message";

const DateField = ({ label }: { label: string }) => {
  const field = useFieldContext<Date>();
  const isDark = useColorScheme() === "dark";

  const [showPicker, setShowPicker] = useState(false);

  const date =
    field.state.value instanceof Date && !Number.isNaN(field.state.value.getTime())
      ? field.state.value
      : new Date();

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="flex-row items-center justify-between rounded-xl bg-gray-100 p-2 pl-4 dark:bg-gray-800"
      >
        <View className="flex-row items-center gap-2">
          <Calendar size={18} color={isDark ? "#9ca3af" : "#4a5565"} />
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
        </View>

        <View className="rounded-lg bg-white p-2 px-3 shadow-sm dark:bg-gray-700">
          <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
            {date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </Text>
        </View>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          mode="date"
          value={date}
          display="calendar"
          maximumDate={new Date()}
          accentColor="#0d542b"
          onValueChange={(_event, picked) => {
            field.handleChange(picked);
            setShowPicker(false);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </>
  );
};

export default DateField;
