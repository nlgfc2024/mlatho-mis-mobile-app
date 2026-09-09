import { HatGlasses } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, useColorScheme, View } from "react-native";

import SwitchInput from "@/src/components/form/switch-input";
import { useFieldContext } from "@/src/providers/form-context";

function AnonymouslyField() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const field = useFieldContext<boolean>();
  const iconColor = field.state.value
    ? isDark
      ? "#4ade80"
      : "#166534"
    : isDark
      ? "#9ca3af"
      : "#4a5565";

  return (
    <View
      className={`flex flex-row items-start justify-between gap-4 rounded-2xl px-4 py-3 ${
        field.state.value ? "bg-green-100 dark:bg-green-950" : "bg-gray-100 dark:bg-gray-800"
      }`}
    >
      <View className="flex flex-1 flex-row items-start gap-3">
        <View className="flex-none py-1">
          <HatGlasses size={24} fill={"none"} color={iconColor} />
        </View>

        <View className="flex flex-1 flex-col gap-0.5">
          <Text
            className={`text-sm font-medium ${field.state.value ? "text-green-800 dark:text-green-300" : "text-gray-700 dark:text-gray-300"}`}
          >
            {t("submit_anonymously")}
          </Text>
          <Text
            className={`text-sm font-normal ${field.state.value ? "text-green-800 dark:text-green-300" : "text-gray-500 dark:text-gray-400"}`}
          >
            {t("submit_anonymously_description")}
          </Text>
        </View>
      </View>

      <View className="flex-none">
        <SwitchInput
          value={field.state.value}
          onValueChange={(value: boolean) => field.handleChange(value)}
        />
      </View>
    </View>
  );
}

export default AnonymouslyField;
