import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import * as VideoThumbnails from "expo-video-thumbnails";
import { ArrowLeft, ImageOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, Pressable, Text, useColorScheme, View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import { withForm } from "@/src/form";
import { grievanceFormOptions } from "@/src/form/grievance";

import Headline from "../ui/headline";

import EvidenceImagePreview from "./evidence-image-preview";

const GrievanceEvidenceFormSection = withForm({
  ...grievanceFormOptions,
  props: { title: "Evidence" },
  render: function Render({ form, title }) {
    const { t } = useTranslation();
    const isDark = useColorScheme() === "dark";
    const evidence = useStore(form.store, (state) => state.values.evidence);

    return (
      <View className="flex flex-1 flex-col gap-5">
        <View className="flex flex-1 flex-col gap-4">
          <View className="flex-none">
            <Headline>{title}</Headline>
          </View>

          <View className="flex flex-1 flex-col gap-5">
            <View className="flex flex-col gap-2">
              <View className="flex flex-col gap-3">
                <View className="flex flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-600 uppercase dark:text-gray-400">
                      {t("add_photos")}
                    </Text>
                  </View>

                  <View className="flex-none">
                    <form.AppField name={"evidence.images"}>
                      {(field) => <field.CameraPhotoField />}
                    </form.AppField>
                  </View>
                </View>

                <View className="h-32">
                  <form.AppField name={"evidence.images"}>
                    {(field) => <field.PhotoPicker label={t("choose_from_gallery")} />}
                  </form.AppField>
                </View>
              </View>

              <View className="mt-2">
                <View className="flex flex-row flex-wrap gap-2">
                  {evidence.images.map((image, index) => (
                    <EvidenceImagePreview key={`${image.uri}-${index}`} image={image} />
                  ))}
                </View>
              </View>

              <form.AppField name={"evidence.images"}>
                {(field) =>
                  !field.state.meta.isValid ? (
                    <ErrorMessage errors={field.state.meta.errors} />
                  ) : null
                }
              </form.AppField>
            </View>

            <View className="flex flex-col gap-3">
              <View className="flex flex-row items-center justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-xs text-gray-600 uppercase dark:text-gray-400">
                    {t("add_videos")}
                  </Text>
                </View>

                <View className="flex flex-row items-center gap-2">
                  <form.AppField name={"evidence.videos"}>
                    {(field) => <field.CameraVideoField />}
                  </form.AppField>
                </View>
              </View>

              <View>
                <form.AppField name={"evidence.videos"}>
                  {(field) => <field.VideoPicker label={t("choose_from_gallery")} />}
                </form.AppField>
              </View>

              <View className="flex flex-row items-center gap-2">
                {evidence.videos.map((video, index) => (
                  <View key={index}>
                    <VideoPreview video={video} />
                  </View>
                ))}
              </View>
            </View>

            {/* <View className="flex flex-col gap-3">
              <View className="border-b border-gray-200 pb-4">
                <Text className="text-base font-medium text-gray-950">Attached files</Text>
              </View>

              <View>
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center gap-2 py-2">
                    <FileMusic size={18} color={"#6a7282"} />
                    <Text className="text-sm text-gray-700 lowercase">G2rDcdbXIAE92fm.m4a</Text>
                  </View>

                  <View className="flex flex-row items-center gap-3">
                    <Text className="text-sm text-gray-500">3.0Mb</Text>

                    <Pressable>
                      <X size={18} color={"#6a7282"} />
                    </Pressable>
                  </View>
                </View>

                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center gap-2 py-2">
                    <FileImage size={18} color={"#6a7282"} />

                    <Text className="text-sm text-gray-700 lowercase">G2P3PJCW8AAPhel.jpg</Text>
                  </View>

                  <View className="flex flex-row items-center gap-3">
                    <Text className="text-sm text-gray-500">345Kb</Text>

                    <Pressable>
                      <X size={18} color={"#6a7282"} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View> */}
          </View>
        </View>

        <View className="flex flex-none flex-row items-stretch justify-between gap-4">
          <Pressable
            onPress={() => form.setFieldValue("section", "details")}
            className="aspect-square items-center justify-center rounded-full border border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
          >
            <ArrowLeft size={20} color={isDark ? "#d1d5db" : "#364153"} strokeWidth={2.25} />
          </Pressable>

          <View className="min-w-0 flex-1">
            <form.AppForm>
              <form.SubscribeButton label={t("continue")} />
            </form.AppForm>
          </View>
        </View>
      </View>
    );
  },
});

function VideoPreview({ video }: { video: any }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["GenerateThumbnail", video.uri],
    queryFn: async () => {
      return await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: 15000,
      });
    },
  });

  if (isPending) {
    return (
      <View className="size-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="size-10 items-center justify-center rounded-lg border border-red-200 bg-red-100 dark:border-red-900 dark:bg-red-950">
        <ImageOff size={16} color={"#ef4444"} />
      </View>
    );
  }

  return <Image className="size-10 rounded-lg" source={{ uri: data?.uri }} />;
}

export default GrievanceEvidenceFormSection;
