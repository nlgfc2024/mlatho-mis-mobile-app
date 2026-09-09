import { Text, View } from "react-native";

import SwitchInput from "./switch-input";

type SwitchRowProps = {
  label: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
};

const SwitchRow = ({ label, value = false, onValueChange, disabled = false }: SwitchRowProps) => {
  return (
    <View
      className={`flex flex-row items-center justify-between gap-4 rounded-2xl px-4 py-2.5 ${
        value ? "bg-green-100 dark:bg-green-950" : "bg-gray-100 dark:bg-gray-800"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <Text
        className={`min-w-0 flex-1 text-sm font-medium ${
          value ? "text-green-800 dark:text-green-300" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {label}
      </Text>

      <View className="flex-none">
        <SwitchInput value={value} onValueChange={onValueChange} disabled={disabled} />
      </View>
    </View>
  );
};

export default SwitchRow;
