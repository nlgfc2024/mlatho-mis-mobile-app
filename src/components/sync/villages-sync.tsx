import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { Check, ClockFading, Hourglass } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { syncMetadataCollection, villagesCollection } from "@/src/powersync/collections";
import { syncVillages } from "@/src/sync/sync-villages";

function isFailedStatus(value: string | null | undefined) {
  return value === "error" || value === "failed";
}

const VillagesSync = () => {
  const { t, i18n } = useTranslation();
  const { data: metadata = [] } = useLiveQuery((q) =>
    q.from({ meta: syncMetadataCollection }).where(({ meta }) => eq(meta.key, "villages")),
  );

  const data = metadata[0];

  const { data: villages = [] } = useLiveQuery((q) => q.from({ village: villagesCollection }));

  const mutation = useMutation({
    mutationKey: ["SyncVillages"],
    mutationFn: async () => {
      await syncVillages();
    },
  });

  return (
    <View>
      <View className="flex flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          {data?.value === "completed" && (
            <View className="rounded-full bg-green-200 p-1">
              <Check size={12} strokeWidth={2.5} color={"#16a34a"} />
            </View>
          )}

          {data?.value === "syncing" && (
            <View className="rounded-full bg-transparent p-1">
              <Hourglass size={12} strokeWidth={2.5} />
            </View>
          )}

          {data?.value === "idle" && (
            <View className="rounded-full bg-transparent p-1">
              <ClockFading size={12} strokeWidth={2.5} />
            </View>
          )}

          <View className="flex flex-row items-center gap-1">
            <Text className="text-sm font-medium text-gray-950">{t("villages")}</Text>
            <Text className="text-sm font-normal text-gray-500">
              (
              {Number(
                data?.value === "syncing" && typeof data.syncedCount === "number"
                  ? data.syncedCount
                  : villages.length,
              ).toLocaleString(i18n.language.startsWith("sw") ? "sw-TZ" : "en-US", {
                style: "decimal",
              })}
              )
            </Text>
          </View>
        </View>

        <View className="flex flex-row items-center gap-2">
          {isFailedStatus(data?.value) && (
            <Pressable
              disabled={mutation.isPending}
              onPress={() => mutation.mutate()}
              className="rounded-full bg-red-100 px-3 py-1"
            >
              <Text className="text-sm font-medium text-red-500">{t("retry")}</Text>
            </Pressable>
          )}

          {data?.value === "syncing" && (
            <Pressable disabled={mutation.isPending} className="rounded-full bg-gray-200 px-3 py-1">
              <Text className="text-sm font-medium text-gray-600">{t("syncing")}</Text>
            </Pressable>
          )}

          {data?.value === "idle" && (
            <Pressable disabled className="rounded-full bg-gray-200 px-3 py-1">
              <Text className="text-sm font-medium text-gray-600">{t("waiting")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

export default VillagesSync;
