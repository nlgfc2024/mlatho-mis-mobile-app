import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import DistrictsSync from "@/src/components/sync/districts-sync";
import RegionsSync from "@/src/components/sync/regions-sync";
import VillagesSync from "@/src/components/sync/villages-sync";
import WardsSync from "@/src/components/sync/wards-sync";
import Headline from "@/src/components/ui/headline";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { ensureLocationSyncMetadata, LOCATION_SYNC_KEYS } from "@/src/onboarding/state";
import { syncMetadataCollection } from "@/src/powersync/collections";
import { useSession } from "@/src/providers/session-context";
import {
  createLocationScopeKey,
  fetchCurrentUserLocationScope,
} from "@/src/sync/current-user-location-scope";
import { syncDistricts } from "@/src/sync/sync-districts";
import { syncRegions } from "@/src/sync/sync-regions";
import { syncVillages } from "@/src/sync/sync-villages";
import { syncWards } from "@/src/sync/sync-wards";

export default function Index() {
  const { t } = useTranslation();
  const { user, accessProfile } = useSession();
  const userReference = user?.reference ?? user?.id ?? null;
  const locationScopeKey =
    userReference && accessProfile
      ? createLocationScopeKey(
          String(userReference),
          (accessProfile?.userDistricts ?? [])
            .map((district) => district?.uuid?.trim() ?? "")
            .filter(Boolean),
        )
      : null;

  const { data: metadata = [] } = useLiveQuery((q) =>
    q
      .from({ meta: syncMetadataCollection })
      .where(({ meta }) => inArray(meta.key, Array.from(LOCATION_SYNC_KEYS))),
  );

  useEffect(() => {
    if (!userReference) return;

    ensureLocationSyncMetadata(userReference, locationScopeKey).catch((error) => {
      console.error("Failed to initialize location sync metadata", error);
    });
  }, [locationScopeKey, userReference]);

  const mutation = useMutation({
    mutationKey: ["LocationSync"],
    mutationFn: async () => {
      const scope = await fetchCurrentUserLocationScope();
      await syncRegions(scope);
      await syncDistricts(scope);
      await syncWards(scope);
      await syncVillages(scope);
    },
  });

  const isSyncing = metadata.some((meta) => {
    return meta.value === "syncing";
  });
  const isSynchronizing = mutation.isPending || isSyncing;

  return (
    <StyledSafeAreaView className="flex-1">
      <View className="flex flex-1 flex-col justify-between">
        <View className="px-4 py-4">
          <View className="flex flex-col gap-1">
            <Headline>{t("data_synchronization")}</Headline>
            <Text className="text-sm text-gray-600">{t("location_sync_description")}</Text>
          </View>

          <View className="mt-6 flex flex-col gap-5 border-t border-gray-300">
            <View className="pt-4">
              <Text className="text-base font-bold text-gray-950">{t("location_data")}</Text>
            </View>

            <View className="flex flex-col gap-4">
              <RegionsSync />
              <DistrictsSync />
              <WardsSync />
              <VillagesSync />
            </View>
          </View>

          {mutation.isError && (
            <View className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3">
              <Text selectable className="text-sm text-red-600">
                {mutation.error.message}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-6 px-4">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              colors={{ contentColor: "#ffffff", containerColor: "#0d542b" }}
              enabled={!isSynchronizing}
              onClick={() => mutation.mutate()}
            >
              <JCText>{isSynchronizing ? t("synchronizing") : t("synchronize_now")}</JCText>
            </Button>
          </Host>
        </View>
      </View>
    </StyledSafeAreaView>
  );
}
