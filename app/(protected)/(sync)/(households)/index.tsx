import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import Headline from "@/src/components/ui/headline";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { villagesCollection } from "@/src/powersync/collections";
import { useSession } from "@/src/providers/session-context";
import { syncVillageHouseholds } from "@/src/sync/sync-village-groups";

export default function HouseholdIndex() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: villages = [] } = useLiveQuery((q) => q.from({ village: villagesCollection }));
  const village = villages.find((row) => row.id === user?.villageId) ?? null;

  const mutation = useMutation({
    mutationKey: ["SyncHouseholds", village?.id],
    mutationFn: async () => {
      if (!village) {
        throw new Error(t("village_is_missing"));
      }
      await syncVillageHouseholds(village, user?.reference);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-4">
        <View className="flex-1">
          <View className="flex-none">
            <Headline>{village?.name ?? t("working_village")}</Headline>
            <View className="flex flex-row items-center gap-2">
              {village?.code && (
                <>
                  <Text className="text-sm font-normal text-gray-950">{village.code}</Text>
                  <View className="size-1 rounded-full bg-gray-300"></View>
                </>
              )}
              <Text className="text-sm font-medium text-gray-500">{t("synchronize")}</Text>
            </View>
          </View>

          {mutation.isPending && (
            <View className="mt-5 flex-1 items-center justify-center border-t border-gray-200">
              <ActivityIndicator />
            </View>
          )}

          {mutation.isError && (
            <View className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3">
              <Text selectable className="text-sm text-red-600">
                {mutation.error.message}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-none">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              enabled={Boolean(village) && !mutation.isPending}
              onClick={() => mutation.mutate()}
              colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
            >
              <JCText>{mutation.isPending ? t("synchronizing") : t("synchronize_now")}</JCText>
            </Button>
          </Host>
        </View>
      </View>
    </StyledSafeAreaView>
  );
}
