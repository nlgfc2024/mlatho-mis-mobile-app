import { useTranslation } from "react-i18next";
import { View } from "react-native";

import PasswordInput from "@/src/components/form/password-input";
import { useFieldContext } from "@/src/providers/form-context";

import ErrorMessage from "./error-message";

const PasswordField = () => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  return (
    <View className="flex flex-col gap-1.5">
      <PasswordInput
        value={field.state.value}
        onChangeText={(text) => field.handleChange(text)}
        placeholder={t("password")}
      />
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default PasswordField;
