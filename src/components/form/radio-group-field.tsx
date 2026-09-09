import { View } from "react-native";

import Label from "@/src/components/form/label";
import RadioGroup from "@/src/components/form/radio-group";

const RadioGroupField = ({ label, options }: { label: string; options: string[] }) => {
  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <RadioGroup options={options} />
    </View>
  );
};

export default RadioGroupField;
