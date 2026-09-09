import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { Check, Hourglass } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { districtsCollection, syncMetadataCollection } from "@/src/powersync/collections";
import { syncDistricts } from "@/src/sync/sync-districts";

function isFailedStatus(value: string | null | undefined) {
  return value === "error" || value === "failed";
}

const DistrictsSync = () => {
  const { t, i18n } = useTranslation();
  const { data: metadata = [] } = useLiveQuery((q) =>
    q.from({ meta: syncMetadataCollection }).where(({ meta }) => eq(meta.key, "districts")),
  );

  const { data: districts = [] } = useLiveQuery((q) => q.from({ district: districtsCollection }));

  const mutation = useMutation({
    mutationKey: ["SyncDistricts"],
    mutationFn: async () => {
      await syncDistricts();
    },
  });

  return (
    <View>
      {metadata.map((meta) => (
        <View key={meta.key} className="flex flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-2">
            {meta.value === "completed" && (
              <View className="rounded-full bg-green-200 p-1">
                <Check size={12} strokeWidth={2.5} color={"#16a34a"} />
              </View>
            )}

            {meta.value === "syncing" && (
              <View className="rounded-full bg-transparent p-1">
                <Hourglass size={12} strokeWidth={2.5} />
              </View>
            )}

            <View className="flex flex-row items-center gap-1">
              <Text className="text-sm font-medium text-gray-950">{t("districts")}</Text>
              <Text className="text-sm font-normal text-gray-500">
                (
                {(meta.value === "syncing" && typeof meta.syncedCount === "number"
                  ? meta.syncedCount
                  : districts.length
                ).toLocaleString(i18n.language.startsWith("sw") ? "sw-TZ" : "en-US")}
                )
              </Text>
            </View>
          </View>

          <View className="flex flex-row items-center gap-2">
            {isFailedStatus(meta.value) && (
              <Pressable
                disabled={mutation.isPending}
                onPress={() => mutation.mutate()}
                className="rounded-full bg-red-100 px-3 py-1"
              >
                <Text className="text-sm font-medium text-red-500">{t("retry")}</Text>
              </Pressable>
            )}

            {meta.value === "syncing" && (
              <Pressable
                disabled={mutation.isPending}
                className="rounded-full bg-transparent px-3 py-1"
              >
                <Text className="text-sm font-medium text-red-500">{t("syncing")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export default DistrictsSync;
