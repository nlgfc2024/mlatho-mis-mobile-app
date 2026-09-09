import { useTranslation } from "react-i18next";
import { Image, ScrollView, Text, View } from "react-native";

import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";

export default function ForgetPasswordScreen() {
  const { t } = useTranslation();

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="flex-1 p-4">
        <View className="flex-1">
          <View className="flex-1">
            <Text>{t("forgot_password")}</Text>
            <View className="flex flex-row items-center justify-center">
              <Image
                source={require("@/assets/images/logo.png")}
                style={{ width: 120, height: 120 }}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
