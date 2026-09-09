import React from "react";
import { TextInputProps, View } from "react-native";

import { useFieldContext } from "@/src/providers/form-context";

import ErrorMessage from "./error-message";
import Input from "./input";
import Label from "./label";

interface ComponentProps extends TextInputProps {
  label: string;
}

const TextField: React.FC<ComponentProps> = ({ label, ...props }) => {
  const field = useFieldContext<string>();

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input
        {...props}
        value={field.state.value}
        onChangeText={(text) => field.handleChange(text)}
      />
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default TextField;
