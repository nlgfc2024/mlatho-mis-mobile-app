import { ImageOff, X } from "lucide-react-native";
import { useState } from "react";
import { Image, Modal, Pressable, useColorScheme, View } from "react-native";

type EvidenceImage = {
  fileName?: string | null;
  uri?: string | null;
};

interface ComponentProps {
  image: EvidenceImage | string | null | undefined;
  size?: "small" | "medium";
}

function getImageUri(image: ComponentProps["image"]) {
  if (typeof image === "string") return image;
  return image?.uri ?? null;
}

const EvidenceImagePreview: React.FC<ComponentProps> = ({ image, size = "small" }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isDark = useColorScheme() === "dark";
  const uri = getImageUri(image);
  const thumbnailClassName =
    size === "medium"
      ? "h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
      : "size-11 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900";
  const placeholderClassName =
    size === "medium"
      ? "h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
      : "size-11 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900";

  if (!uri) {
    return (
      <View className={placeholderClassName}>
        <ImageOff size={size === "medium" ? 20 : 16} color={isDark ? "#9ca3af" : "#6a7282"} />
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Preview attached image"
        accessibilityRole="imagebutton"
        onPress={() => setIsPreviewOpen(true)}
        className={thumbnailClassName}
      >
        <Image source={{ uri }} className="size-full" resizeMode="cover" />
      </Pressable>

      <Modal
        visible={isPreviewOpen}
        animationType="fade"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View className="absolute top-0 right-0 z-10 px-5 pt-14">
            <Pressable
              accessibilityLabel="Close image preview"
              accessibilityRole="button"
              onPress={() => setIsPreviewOpen(false)}
              className="items-center justify-center rounded-full bg-white/20 p-3"
            >
              <X size={24} color={"#ffffff"} />
            </Pressable>
          </View>

          <View className="flex-1 px-4 py-20">
            <Image source={{ uri }} className="h-full w-full" resizeMode="contain" />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default EvidenceImagePreview;
