import * as ImagePicker from "expo-image-picker";
import { FilePlay } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, useColorScheme } from "react-native";

import { useFieldContext } from "@/src/providers/form-context";

interface ComponentProps {
  label: string;
}

const VideoPicker: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<any[]>();
  const isDark = useColorScheme() === "dark";

  async function handlePickVideo() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(t("permission_required"), t("media_library_permission_required"));
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });

    if (!result.canceled) {
      result.assets.forEach((asset) => {
        field.handleChange((state = []) => [...state, asset]);
      });
    }
  }

  return (
    <Pressable
      onPress={handlePickVideo}
      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-100 py-12 dark:border-gray-800 dark:bg-gray-900"
    >
      <FilePlay size={20} color={isDark ? "#9ca3af" : "#6a7282"} />
      <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">{label}</Text>
    </Pressable>
  );
};

export default VideoPicker;
