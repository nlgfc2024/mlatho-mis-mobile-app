import { Button, Host, Switch, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Headline from "@/src/components/ui/headline";
import { ROW_SEPARATOR_COLOR, ROW_SEPARATOR_WIDTH } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { goBackOrReplace } from "@/src/lib/navigation";
import {
  householdsCollection,
  targetedMembersCollection,
  villagesCollection,
} from "@/src/powersync/collections";
import { syncVillageHouseholds } from "@/src/sync/sync-village-groups";

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function isDeleted(record: { deletedAt?: string | null; isDeleted?: number | null }) {
  return Boolean(record.deletedAt || record.isDeleted);
}

export default function ShowUserLocationScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();

  const [isActive, setIsActive] = useState(false);

  const params = useLocalSearchParams<{ id: string }>();

  const villageId = params.id;
  const hasValidVillageId = Boolean(villageId);

  const { data: villages = [], isLoading: isVillageLoading } = useLiveQuery(
    (q) => {
      if (!villageId) return undefined;
      return q
        .from({ village: villagesCollection })
        .where(({ village }) => eq(village.id, villageId));
    },
    [villageId],
  );

  const { data: households = [], isLoading: isHouseholdsLoading } = useLiveQuery(
    (q) => {
      if (!villageId) return undefined;
      return q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.villageId, villageId));
    },
    [villageId],
  );

  const { data: targetedMembers = [], isLoading: isTargetedMembersLoading } = useLiveQuery(
    (q) => {
      if (!villageId) return undefined;
      return q
        .from({ member: targetedMembersCollection })
        .where(({ member }) => eq(member.villageId, villageId));
    },
    [villageId],
  );

  const activeHouseholds = useMemo(
    () => households.filter((household) => !isDeleted(household)),
    [households],
  );
  const activeTargetedMembers = useMemo(
    () => targetedMembers.filter((member) => !isDeleted(member)),
    [targetedMembers],
  );

  const data = villages[0] ?? null;
  const isPending = isVillageLoading || isHouseholdsLoading || isTargetedMembersLoading;

  useEffect(() => {
    navigation.setOptions({
      title: data?.name ?? t("location"),
    });
  }, [data?.name, navigation, t]);

  const mutation = useMutation({
    mutationKey: ["SyncLocationIndividuals"],
    mutationFn: async () => {
      if (!data?.id) {
        throw new Error("Village ID is missing");
      }
      await syncVillageHouseholds(data);
    },
    onSuccess: () => {
      goBackOrReplace(router, "/account");
    },
    onError: (error) => {
      console.error(error);
    },
  });

  if (!hasValidVillageId) {
    return (
      <StyledSafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 bg-gray-100 dark:bg-gray-950"
      >
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-gray-600">{t("no_location_found")}</Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  if (isPending) {
    return (
      <StyledSafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 bg-gray-100 dark:bg-gray-950"
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </StyledSafeAreaView>
    );
  }

  if (!data) {
    return (
      <StyledSafeAreaView
        edges={["left", "right", "bottom"]}
        className="flex-1 bg-gray-100 dark:bg-gray-950"
      >
        <View className="flex-1 p-4">
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-gray-600">{t("no_location_found")}</Text>
          </View>
        </View>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-gray-100 dark:bg-gray-950"
    >
      <View className="flex flex-row items-end justify-between px-4 py-4">
        <View>
          <Headline>{data?.name}</Headline>

          <View className="flex flex-row gap-1">
            <Text className="text-sm text-gray-600">{t("households_available")}</Text>
            <Text className="text-sm text-gray-600">({formatCount(activeHouseholds.length)})</Text>
          </View>
        </View>

        <View>
          <Host matchContents>
            <Switch
              value={isActive}
              colors={{ checkedTrackColor: "#15803d" }}
              onCheckedChange={(value) => setIsActive(value)}
            />
          </Host>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-4">
        <View className="px-4 pt-2 pb-2">
          <Text className="text-sm font-semibold text-gray-700">{t("synced_data")}</Text>
        </View>

        <View className="mx-4 overflow-hidden rounded-2xl bg-white">
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/account/location/households",
                params: { villageId, villageName: data.name },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t("view_households_in", { name: data.name })}
            className="flex-row items-center justify-between gap-4 px-4 py-4 focus:bg-gray-50 active:bg-gray-50"
          >
            <Text className="text-sm font-normal text-gray-950">{t("households")}</Text>

            <View className="flex-row items-center gap-1">
              <Text className="text-sm font-medium text-gray-600">
                {formatCount(activeHouseholds.length)}
              </Text>
              <ChevronRight size={18} strokeWidth={2} color={"#6a7282"} />
            </View>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/targeted-members",
                params: { villageId },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t("view_targeted_members_in", { name: data.name })}
            className="flex-row items-center justify-between gap-4 px-4 py-4 focus:bg-gray-50 active:bg-gray-50"
            style={styles.rowSeparator}
          >
            <Text className="text-sm font-normal text-gray-950">{t("targeted_members")}</Text>

            <View className="flex-row items-center gap-1">
              <Text className="text-sm font-medium text-gray-600">
                {formatCount(activeTargetedMembers.length)}
              </Text>
              <ChevronRight size={18} strokeWidth={2} color={"#6a7282"} />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {!activeHouseholds.length ? (
        <View className="flex-none p-4">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
              enabled={!mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              <JCText>{mutation.isPending ? t("synchronizing") : t("synchronize_now")}</JCText>
            </Button>
          </Host>
        </View>
      ) : null}
    </StyledSafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowSeparator: { borderTopWidth: ROW_SEPARATOR_WIDTH, borderTopColor: ROW_SEPARATOR_COLOR },
});
