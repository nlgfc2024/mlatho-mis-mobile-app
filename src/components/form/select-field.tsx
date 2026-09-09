import { View } from "react-native";

import Label from "@/src/components/form/label";
import { useFieldContext } from "@/src/providers/form-context";

import ErrorMessage from "./error-message";
import Select from "./select";

const SelectField = ({ label }: { label: string }) => {
  const field = useFieldContext<string>();

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select value={field.state.value} onValueChange={(text) => field.handleChange(text)}>
        <Select.Option item={"david"}>David</Select.Option>
      </Select>
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default SelectField;
