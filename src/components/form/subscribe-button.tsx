import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text } from "react-native";

import { useFormContext } from "@/src/providers/form-context";

interface ComponentProps {
  label: string;
}

const SubscribeButton: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
          disabled={isSubmitting}
          onPress={() => form.handleSubmit()}
          className="h-11 w-full items-center justify-center rounded-full"
          style={{ backgroundColor: "#0d542b", opacity: isSubmitting ? 0.6 : 1 }}
        >
          <Text className="font-medium text-white">{isSubmitting ? t("loading") : label}</Text>
        </Pressable>
      )}
    </form.Subscribe>
  );
};

export default SubscribeButton;
