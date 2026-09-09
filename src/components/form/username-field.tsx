import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import UsernameInput from "@/src/components/form/username-input";
import { useFieldContext } from "@/src/providers/form-context";

const UsernameField = () => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  return (
    <View className="flex flex-col gap-1.5">
      <UsernameInput
        value={field.state.value}
        onChangeText={(text) => field.handleChange(text)}
        placeholder={t("username")}
      />
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default UsernameField;
