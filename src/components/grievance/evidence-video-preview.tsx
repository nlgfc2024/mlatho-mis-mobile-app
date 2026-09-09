import { useQuery } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { ImageOff, Play, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, useColorScheme, View } from "react-native";

import { normalizeGrievanceEvidenceAsset } from "@/src/lib/grievance-evidence";

interface ComponentProps {
  video: unknown;
  size?: "small" | "medium";
}

const EvidenceVideoPreview: React.FC<ComponentProps> = ({ video, size = "small" }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isDark = useColorScheme() === "dark";
  const asset = normalizeGrievanceEvidenceAsset(video);
  const uri = asset?.uri ?? null;
  const thumbnailClassName =
    size === "medium"
      ? "h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
      : "size-11 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900";
  const placeholderClassName =
    size === "medium"
      ? "h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
      : "size-11 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900";
  const placeholderIconColor = isDark ? "#9ca3af" : "#6a7282";

  const { data, isPending, isError } = useQuery({
    queryKey: ["GenerateThumbnail", uri],
    queryFn: async () => {
      return await VideoThumbnails.getThumbnailAsync(uri!, {
        time: 1000,
      });
    },
    enabled: Boolean(uri),
  });

  if (!uri) {
    return (
      <View className={placeholderClassName}>
        <ImageOff size={size === "medium" ? 20 : 16} color={placeholderIconColor} />
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Preview attached video"
        accessibilityRole="button"
        onPress={() => setIsPreviewOpen(true)}
        className={thumbnailClassName}
      >
        {isPending ? (
          <View className="size-full items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : isError || !data?.uri ? (
          <View className="size-full items-center justify-center">
            <ImageOff size={size === "medium" ? 20 : 16} color={placeholderIconColor} />
          </View>
        ) : (
          <Image source={{ uri: data.uri }} className="size-full" resizeMode="cover" />
        )}

        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <View className="items-center justify-center rounded-full bg-black/45 p-2">
            <Play size={size === "medium" ? 18 : 14} color={"#ffffff"} fill={"#ffffff"} />
          </View>
        </View>
      </Pressable>

      <Modal
        visible={isPreviewOpen}
        animationType="fade"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View className="absolute top-0 right-0 z-10 px-5 pt-14">
            <Pressable
              accessibilityLabel="Close video preview"
              accessibilityRole="button"
              onPress={() => setIsPreviewOpen(false)}
              className="items-center justify-center rounded-full bg-white/20 p-3"
            >
              <X size={24} color={"#ffffff"} />
            </Pressable>
          </View>

          <View className="flex-1 px-4 py-20">
            {isPreviewOpen && <VideoPreviewPlayer uri={uri} />}
          </View>
        </View>
      </Modal>
    </>
  );
};

function VideoPreviewPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ height: "100%", width: "100%" }}
    />
  );
}

export default EvidenceVideoPreview;
