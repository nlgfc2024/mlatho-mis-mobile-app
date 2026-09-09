import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";

export default function ListUserLocationScreen() {
  const { t } = useTranslation();

  return (
    <StyledSafeAreaView edges={["left", "right", "bottom"]}>
      <View>
        <Text>{t("list_user_location")}</Text>
      </View>
    </StyledSafeAreaView>
  );
}
