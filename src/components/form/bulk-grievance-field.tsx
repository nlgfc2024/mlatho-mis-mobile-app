import { Package2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, useColorScheme, View } from "react-native";

import { resetConditionalComplaintFields } from "@/src/form/grievance-mode";
import { useFieldContext, useFormContext } from "@/src/providers/form-context";
import { grievanceStore } from "@/src/store/grievance-store";

import SwitchInput from "./switch-input";

const BulkGrievanceField = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const field = useFieldContext<boolean>();
  const form = useFormContext();
  const iconColor = field.state.value
    ? isDark
      ? "#4ade80"
      : "#166534"
    : isDark
      ? "#9ca3af"
      : "#475569";

  return (
    <View
      className={`flex flex-row items-start justify-between gap-4 rounded-2xl px-4 py-3 ${
        field.state.value ? "bg-green-100 dark:bg-green-950" : "bg-gray-100 dark:bg-gray-800"
      }`}
    >
      <View className="flex-1">
        <View className="flex flex-col gap-1">
          <View className="flex flex-row items-center gap-1.5">
            <Package2 size={16} color={iconColor} strokeWidth={2} />
            <Text
              className={`text-sm font-medium ${
                field.state.value
                  ? "text-green-800 dark:text-green-300"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {t("is_bulk_grievance")}
            </Text>
          </View>
          <Text
            className={`text-xs ${field.state.value ? "text-green-800 dark:text-green-300" : "text-gray-600 dark:text-gray-400"}`}
          >
            {t("bulk_grievance_description")}
          </Text>
        </View>
      </View>
      <View className="flex-none">
        <SwitchInput
          value={field.state.value}
          onValueChange={(value: boolean) => {
            field.handleChange(value);
            resetConditionalComplaintFields((fieldName) => form.resetField(fieldName as never));
            grievanceStore.setState((state) => ({
              ...state,
              complainantId: null,
              complainant: null,
            }));
          }}
        />
      </View>
    </View>
  );
};

export default BulkGrievanceField;
