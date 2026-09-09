import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { Building2, Mail, Phone, UserRound, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  Linking,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Facilitator } from "@/src/data/trainings";

const SHEET_BACKGROUND = "#ffffff";
const SHEET_MAX_WIDTH = 640;

type FacilitatorSheetProps = {
  facilitator: Facilitator;
  visible: boolean;
  onClose: () => void;
};

export default function FacilitatorSheet({
  facilitator,
  visible,
  onClose,
}: FacilitatorSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const sheetWidth = Math.min(width, SHEET_MAX_WIDTH);

  return (
    <Host matchContents>
      {visible && (
        <ModalBottomSheet
          containerColor={SHEET_BACKGROUND}
          onDismissRequest={onClose}
        >
          <RNHostView matchContents>
            <View
              className="gap-5 py-4"
              style={{ width: sheetWidth, paddingBottom: insets.bottom + 16 }}
            >
              <View className="flex-row items-center justify-between px-5">
                <Text className="text-base font-semibold text-gray-950">
                  {t("facilitator_details")}
                </Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <X size={20} color="#6a7282" />
                </Pressable>
              </View>

              <View className="flex-row items-center gap-3 px-5">
                <View className="rounded-full bg-gray-200 p-3">
                  <UserRound size={24} color="#6a7282" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-950">
                    {facilitator.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Building2 size={14} color="#6a7282" />
                    <Text className="text-sm text-gray-500">
                      {facilitator.organization} · {facilitator.role}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mx-5 h-px bg-gray-100" />

              <View className="gap-4 px-5">
                <Pressable
                  className="flex-row items-center gap-3"
                  onPress={() => Linking.openURL(`tel:${facilitator.phone}`)}
                >
                  <Phone size={18} color="#6a7282" />
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">{t("phone")}</Text>
                    <Text className="text-sm font-medium text-gray-950">
                      {facilitator.phone}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  className="flex-row items-center gap-3"
                  onPress={() => Linking.openURL(`mailto:${facilitator.email}`)}
                >
                  <Mail size={18} color="#6a7282" />
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">{t("email")}</Text>
                    <Text className="text-sm font-medium text-gray-950">
                      {facilitator.email}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </RNHostView>
        </ModalBottomSheet>
      )}
    </Host>
  );
}
