import { eq, useLiveQuery } from "@tanstack/react-db";
import { Stack, useLocalSearchParams } from "expo-router";
import { Search, UsersRound } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { householdsCollection } from "@/src/powersync/collections";

type HouseholdRow = NonNullable<ReturnType<typeof householdsCollection.get>>;

function isDeleted(household: HouseholdRow) {
  return Boolean(household.deletedAt);
}

function getHouseholdName(household: HouseholdRow) {
  return household.headName?.trim() || "Unnamed household";
}

export default function LocationHouseholdsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ villageId?: string; villageName?: string }>();
  const villageId = params.villageId ?? null;
  const villageName = params.villageName;
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useLiveQuery(
    (q) => {
      if (!villageId) return undefined;
      return q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.villageId, villageId))
        .orderBy(({ household }) => household.headName, "asc");
    },
    [villageId],
  );

  const households = useMemo(() => data.filter((household) => !isDeleted(household)), [data]);

  const filteredHouseholds = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return households;

    return households.filter((household) => {
      const name = getHouseholdName(household).toLowerCase();
      const groupCode = household.groupCode?.toLowerCase() ?? "";
      const representative = household.representativeName?.toLowerCase() ?? "";
      const address = household.address?.toLowerCase() ?? "";

      return (
        name.includes(term) ||
        groupCode.includes(term) ||
        representative.includes(term) ||
        address.includes(term)
      );
    });
  }, [households, search]);

  if (isLoading) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
        <Stack.Screen options={{ title: t("households") }} />
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#0d542b" />
          <Text className="text-sm text-gray-500">{t("loading_households")}</Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white">
      <Stack.Screen options={{ title: t("households") }} />

      <View className="gap-2 px-4 py-4">
        {villageName ? (
          <Text className="text-sm font-medium text-gray-500">{villageName}</Text>
        ) : null}

        <View className="flex-row items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
          <Search size={18} color="#6b7280" strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("search_households")}
            placeholderTextColor="#9ca3af"
            className="min-h-8 flex-1 text-base text-gray-950"
          />
        </View>
      </View>

      <FlatList
        data={filteredHouseholds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-2 px-4">
            <Text className="text-base font-semibold text-gray-950">
              {t("no_households_found")}
            </Text>
            <Text className="text-center text-sm text-gray-500">
              {search.trim() ? t("no_households_match_search") : t("no_households_synced_location")}
            </Text>
          </View>
        }
        renderItem={({ item }) => <HouseholdListItem household={item} />}
      />
    </StyledSafeAreaView>
  );
}

function HouseholdListItem({ household }: { household: HouseholdRow }) {
  const groupCode = household.groupCode?.trim() || "N/A";
  const representative = household.representativeName?.trim();
  const address = household.address?.trim();
  const rowSeparatorStyle = useRowSeparatorStyle("top");

  return (
    <View style={rowSeparatorStyle} className="flex-row items-stretch gap-3 p-4">
      <View className="aspect-square size-12 items-center justify-center rounded-xl bg-gray-200/75">
        <UsersRound size={20} color="#6b7280" />
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <View>
          <Text className="text-xs font-medium text-green-600">{groupCode}</Text>
          <Text className="text-base leading-5 font-bold text-gray-950" numberOfLines={2}>
            {getHouseholdName(household)}
          </Text>
        </View>

        {representative ? (
          <Text className="text-sm font-normal text-gray-600" numberOfLines={1}>
            {representative}
          </Text>
        ) : null}
        {address ? (
          <Text className="text-sm font-normal text-gray-500" numberOfLines={1}>
            {address}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
