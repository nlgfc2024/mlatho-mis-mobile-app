import { useLiveQuery } from "@tanstack/react-db";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CaseManagementListItem, {
  type HouseholdItem,
} from "@/src/components/case-management/case-management-list-item";
import HouseholdFilterSheet from "@/src/components/case-management/household-filter-sheet";
import PendingDataUpdateSyncBanner from "@/src/components/case-management/pending-data-update-sync-banner";
import SearchInput from "@/src/components/form/search-input";
import ListFilterIcon from "@/src/components/ui/list-filter-icon";
import {
  getPlaceholderMobileNumber,
  getPlaceholderPaymentDataUpdateIds,
  isMobileMoneyAccount,
} from "@/src/lib/payment-data-update";
import {
  householdMembersCollection,
  householdsCollection,
  paymentAccountsCollection,
} from "@/src/powersync/collections";
import {
  DEFAULT_HOUSEHOLD_LIST_OPTIONS,
  filterAndSortHouseholds,
  type HouseholdListOptions,
} from "@/src/utils/case-management-household-list";

export default function HouseholdList() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const [search, setSearch] = useState("");
  const [listOptions, setListOptions] = useState<HouseholdListOptions>(
    DEFAULT_HOUSEHOLD_LIST_OPTIONS,
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: householdRows = [] } = useLiveQuery((q) =>
    q
      .from({ household: householdsCollection })
      .orderBy(({ household }) => household.headName, "asc"),
  );
  const { data: memberRows = [] } = useLiveQuery((q) =>
    q.from({ member: householdMembersCollection }),
  );
  const { data: accountRows = [] } = useLiveQuery((q) =>
    q.from({ account: paymentAccountsCollection }),
  );
  const households = useMemo<HouseholdItem[]>(() => {
    const placeholderCandidates: Parameters<typeof getPlaceholderPaymentDataUpdateIds>[0] = [];
    const items = householdRows.map<HouseholdItem>((row) => {
      const memberCount = memberRows.filter(
        (member) => member.householdUuid === row.uuid && !member.deletedAt,
      ).length;
      const account = accountRows
        .filter((item) => item.houseHoldId === row.uuid && !item.deletedAt)
        .sort((first, second) => {
          if (Number(second.isActive) !== Number(first.isActive)) {
            return Number(second.isActive) - Number(first.isActive);
          }
          return String(second.updatedAt ?? second.createdAt ?? "").localeCompare(
            String(first.updatedAt ?? first.createdAt ?? ""),
          );
        })[0];

      placeholderCandidates.push({
        id: row.id,
        accountProvider: account?.accountProvider,
        accountNumber: account?.accountNumber,
        seed: `${row.uuid ?? row.id}:${account?.accountNumber ?? ""}`,
        allowSynthetic: !account?.accountProvider && !account?.accountNumber,
      });

      return {
        id: row.id,
        reference: row.reference ?? null,
        uuid: row.uuid ?? null,
        headName: row.headName ?? null,
        representativeName: row.representativeName ?? null,
        groupCode: row.groupCode ?? null,
        address: row.address ?? null,
        status: row.caseStatus === "inactive" ? "inactive" : "active",
        deactivationReason: row.deactivationReason ?? null,
        deactivatedAt: row.deactivatedAt ?? null,
        villageId: row.villageId ?? null,
        memberCount,
        isActive: Boolean(account?.isActive),
        accountUuid: account?.uuid ?? account?.id ?? null,
        accountName: account?.accountName ?? t("account_name"),
        accountNumber: account?.accountNumber ?? t("account_number"),
        accountProvider: account?.accountProvider,
        hasPaymentDetails: Boolean(account),
        needsPaymentDataUpdate: false,
      };
    });

    const flaggedIds = getPlaceholderPaymentDataUpdateIds(placeholderCandidates);

    return items.map((item) => {
      const needsPaymentDataUpdate = flaggedIds.has(item.id);
      const needsSyntheticMobileAccount =
        needsPaymentDataUpdate &&
        !isMobileMoneyAccount({
          accountProvider: item.accountProvider,
          accountNumber: item.accountNumber,
        });

      return {
        ...item,
        accountProvider: needsSyntheticMobileAccount ? "M-PESA" : item.accountProvider,
        accountNumber: needsSyntheticMobileAccount
          ? getPlaceholderMobileNumber(item.uuid ?? item.id)
          : item.accountNumber,
        needsPaymentDataUpdate,
      };
    });
  }, [accountRows, householdRows, memberRows, t]);

  const filtered = useMemo(() => {
    return filterAndSortHouseholds(households, search, listOptions);
  }, [households, listOptions, search]);

  const hasActiveListOptions =
    listOptions.paymentFilter !== "all" || listOptions.memberSort !== "default";

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: isDark ? "#030712" : "#ffffff" }}
    >
      <PendingDataUpdateSyncBanner />

      <View className="flex-row items-center gap-2 p-4">
        <View className="flex-1">
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("search_household")}
          />
        </View>
        <Pressable
          onPress={() => setIsFilterOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("filter_and_sort_households")}
          accessibilityState={{ expanded: isFilterOpen, selected: hasActiveListOptions }}
          className={[
            "size-10 items-center justify-center rounded-full active:opacity-80",
            hasActiveListOptions
              ? "bg-emerald-800 dark:bg-emerald-700"
              : "bg-gray-100 dark:bg-gray-800",
          ].join(" ")}
        >
          <ListFilterIcon
            color={hasActiveListOptions ? "#ffffff" : isDark ? "#9ca3af" : "#374151"}
          />
          {hasActiveListOptions ? (
            <View className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-amber-500 dark:border-gray-950" />
          ) : null}
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }: { item: HouseholdItem }) => <CaseManagementListItem item={item} />}
        ListEmptyComponent={
          <View className="px-4 py-10">
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
              {listOptions.paymentFilter === "phone-update-required"
                ? t("no_households_require_phone_update")
                : t("no_households_found")}
            </Text>
          </View>
        }
      />

      <HouseholdFilterSheet
        visible={isFilterOpen}
        value={listOptions}
        onApply={setListOptions}
        onClose={() => setIsFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
