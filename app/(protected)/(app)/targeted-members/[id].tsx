import { eq, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams } from "expo-router";
import {
  CreditCard,
  History,
  ListChecks,
  Layers3,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import {
  EMPTY_VALUE,
  formatLocationHierarchyExcludingVillage,
  formatTargetedMemberDate,
  formatVillageName,
  getTargetedMemberLocation,
  getTargetedMemberName,
} from "@/src/features/targeted-members/utils";
import { targetedMembersCollection } from "@/src/powersync/collections";

type DetailTab = {
  label: string;
  Icon: LucideIcon;
};

const DETAIL_TABS: DetailTab[] = [
  { label: "benefits", Icon: CreditCard },
  { label: "overview", Icon: UserRound },
  { label: "programs", Icon: Layers3 },
  { label: "change_logs", Icon: History },
  { label: "tasks", Icon: ListChecks },
  { label: "group_history", Icon: Users },
];

type TargetedMemberRow = NonNullable<ReturnType<typeof targetedMembersCollection.get>>;

type Field = { label: string; value: string | null | undefined; last?: boolean };

function DetailRow({ label, value, last }: Field) {
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  return (
    <View
      className="flex-row items-start justify-between py-4"
      style={last ? undefined : rowSeparatorStyle}
    >
      <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="max-w-[60%] text-right text-sm font-medium text-gray-950 dark:text-gray-50">
        {value ?? EMPTY_VALUE}
      </Text>
    </View>
  );
}

function DetailTabs({
  tabs,
  selectedIndex,
  onSelect,
}: {
  tabs: DetailTab[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  return (
    <View accessibilityRole="tablist" className="border-b border-gray-200 dark:border-gray-800">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-4 px-4">
          {tabs.map(({ label, Icon }, index) => {
            const isSelected = selectedIndex === index;

            return (
              <Pressable
                key={label}
                onPress={() => onSelect(index)}
                accessibilityRole="tab"
                accessibilityLabel={t(label)}
                accessibilityState={{ selected: isSelected }}
                className="h-14 items-center justify-center"
              >
                <View
                  className={
                    isSelected
                      ? "h-full items-center justify-center border-b-2 border-gray-900 px-4 dark:border-gray-100"
                      : "h-full items-center justify-center border-b-2 border-transparent px-4"
                  }
                  style={{ marginBottom: -1 }}
                >
                  <Icon
                    size={20}
                    strokeWidth={2.2}
                    color={
                      isSelected
                        ? isDark
                          ? "#f9fafb"
                          : "#111827"
                        : isDark
                          ? "#9ca3af"
                          : "#6b7280"
                    }
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="py-10">
      <Text className="text-center text-sm text-gray-500 dark:text-gray-400">{message}</Text>
    </View>
  );
}

function OverviewTab({ targetedMember }: { targetedMember: TargetedMemberRow }) {
  const { t } = useTranslation();
  const location = getTargetedMemberLocation(targetedMember);
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  const village = formatVillageName(targetedMember);
  const restHierarchy = formatLocationHierarchyExcludingVillage(location);

  return (
    <View className="-mb-4">
      <DetailRow label={t("tf4_number")} value={targetedMember.tf4No?.trim() || EMPTY_VALUE} />
      <DetailRow
        label={t("interview_key")}
        value={targetedMember.interviewKey?.trim() || EMPTY_VALUE}
      />
      <DetailRow
        label={t("date_of_birth")}
        value={formatTargetedMemberDate(targetedMember.dateOfBirth)}
      />
      <View className="flex-row items-start justify-between py-4" style={rowSeparatorStyle}>
        <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">{t("location")}</Text>
        <View className="max-w-[60%] items-end">
          <Text className="text-right text-sm font-medium text-gray-950 dark:text-gray-50">
            {village}
          </Text>
          {restHierarchy && restHierarchy !== EMPTY_VALUE ? (
            <Text className="mt-0.5 text-right text-xs text-gray-500 dark:text-gray-400">
              {restHierarchy}
            </Text>
          ) : null}
        </View>
      </View>
      <DetailRow
        label={t("last_updated_by")}
        value={targetedMember.userUpdatedUsername?.trim() || EMPTY_VALUE}
      />
      <DetailRow
        label={t("created_date")}
        value={formatTargetedMemberDate(targetedMember.createdAt)}
      />
      <DetailRow
        label={t("updated_date")}
        value={formatTargetedMemberDate(targetedMember.updatedAt)}
        last
      />
    </View>
  );
}

function BenefitsTab() {
  const { t } = useTranslation();
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");
  const benefitSummary = [
    { label: t("total_number_of_benefits"), value: "0" },
    { label: t("total_amount_due"), value: "TZS 0" },
    { label: t("total_amount_received"), value: "TZS 0" },
  ];

  return (
    <View className="-mb-4">
      {benefitSummary.map((item, index) => {
        const last = index === benefitSummary.length - 1;
        return (
          <View key={item.label} className="py-4" style={last ? undefined : rowSeparatorStyle}>
            <Text className="text-sm font-normal text-gray-950 dark:text-gray-50">{item.label}</Text>
            <Text className="mt-1 text-2xl font-bold text-gray-950 dark:text-gray-50">
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function TargetedMemberDetailScreen() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { id } = useLocalSearchParams<{ id?: string }>();
  const targetedMemberId = typeof id === "string" ? id : undefined;
  const [activeTab, setActiveTab] = useState(0);

  const { data = [], isLoading } = useLiveQuery(
    (q) => {
      if (!targetedMemberId) return undefined;
      return q
        .from({ member: targetedMembersCollection })
        .where(({ member }) => eq(member.id, targetedMemberId));
    },
    [targetedMemberId],
  );

  const targetedMember = useMemo(() => data.find((member) => !member.deletedAt), [data]);

  if (!targetedMemberId) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("targeted_member_not_found")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color={isDark ? "#4ade80" : "#0d542b"} />
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t("loading_targeted_member")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  if (!targetedMember) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("targeted_member_not_found")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  const fullName = getTargetedMemberName(targetedMember);
  const location = getTargetedMemberLocation(targetedMember);
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-4 pt-4 pb-4">
          <View className="flex-row items-start gap-3">
            <View className="size-16 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
              {initials ? (
                <Text className="text-xl font-bold text-gray-700 dark:text-gray-300">
                  {initials}
                </Text>
              ) : (
                <UserRound size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
              )}
            </View>

            <View className="min-w-0 flex-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t("last_updated_value", {
                  value: formatTargetedMemberDate(targetedMember.updatedAt),
                })}
              </Text>
              <Text
                className="mt-0.5 text-xl font-bold text-gray-950 dark:text-gray-50"
                numberOfLines={2}
              >
                {fullName}
              </Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatLocationHierarchyExcludingVillage(location)}
              </Text>
            </View>
          </View>
        </View>

        <DetailTabs tabs={DETAIL_TABS} selectedIndex={activeTab} onSelect={setActiveTab} />

        <View className="px-4 pb-4">
          {activeTab === 0 && <BenefitsTab />}
          {activeTab === 1 && <OverviewTab targetedMember={targetedMember} />}
          {activeTab === 2 && <EmptyState message={t("no_programs_targeted_member")} />}
          {activeTab === 3 && <EmptyState message={t("no_change_logs_available")} />}
          {activeTab === 4 && <EmptyState message={t("no_tasks_targeted_member")} />}
          {activeTab === 5 && <EmptyState message={t("no_group_history_found")} />}
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
