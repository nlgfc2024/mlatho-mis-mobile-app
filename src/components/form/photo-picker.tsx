import * as ImagePicker from "expo-image-picker";
import { ImagePlus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, useColorScheme } from "react-native";

import { useFieldContext } from "@/src/providers/form-context";

interface ComponentProps {
  label: string;
}

const PhotoPicker: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<any[]>();
  const isDark = useColorScheme() === "dark";

  const handlePickImage = async () => {
    // No permissions request is necessary for launching the image library.
    // Manually request permissions for videos on iOS when `allowsEditing` is set to `false`
    // and `videoExportPreset` is `'Passthrough'` (the default), ideally before launching the picker
    // so the app users aren't surprised by a system dialog after picking a video.
    // See "Invoke permissions for videos" sub section for more details.
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(t("permission_required"), t("media_library_permission_required"));
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      result.assets.forEach((asset) => {
        field.handleChange((state = []) => [...state, asset]);
      });
    }
  };

  return (
    <Pressable
      onPress={handlePickImage}
      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-100 py-12 dark:border-gray-800 dark:bg-gray-900"
    >
      <ImagePlus size={20} color={isDark ? "#9ca3af" : "#6a7282"} />
      <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">{label}</Text>
    </Pressable>
  );
};

export default PhotoPicker;
