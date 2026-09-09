import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { eq, isNull, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import ProgressRing from "@/src/components/ui/progress-ring";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translateDeactivationReason } from "@/src/i18n/helpers";
import { goBackOrReplace } from "@/src/lib/navigation";
import { householdMembersCollection } from "@/src/powersync/collections";
import {
  formatHouseholdMemberRowSummary,
  getHouseholdMemberInitials,
  getHouseholdMemberProfileCompletion,
  getHouseholdMemberRoleLabel,
} from "@/src/utils/household-member";
import { getHouseholdRepresentativeDisplayName } from "@/src/utils/household-representative";

function getProfileCompletionColor(percentage: number) {
  if (percentage < 50) return "#dc2626";
  if (percentage < 80) return "#d97706";

  return "#16a34a";
}

export default function HouseholdMembers() {
  const { t } = useTranslation();
  const { uuid, household, id } = useLocalSearchParams<{
    id: string;
    uuid: string;
    household: string;
  }>();
  const router = useRouter();
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  const item = useMemo(() => {
    try {
      return household ? JSON.parse(household) : null;
    } catch {
      return null;
    }
  }, [household]);

  const { data: members = [] } = useLiveQuery(
    (q) =>
      q
        .from({ member: householdMembersCollection })
        .where(({ member }) => eq(member.householdUuid, uuid ?? ""))
        .where(({ member }) => isNull(member.deletedAt))
        .orderBy(({ member }) => member.isActive, "desc")
        .orderBy(({ member }) => member.fullName, "asc"),
    [uuid],
  );

  if (!item || !uuid) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">
          {t("household_data_not_found")}
        </Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </StyledSafeAreaView>
    );
  }

  const householdIsActive = item.status !== "inactive";
  const representativeName = getHouseholdRepresentativeDisplayName(item);

  const handleShowMember = (member: (typeof members)[number]) => {
    router.push({
      pathname: "/(protected)/(app)/case-management/members/[id]",
      params: {
        id: member.uuid ?? member.id,
        householdId: id,
        uuid,
        household,
        member: JSON.stringify(member),
      },
    });
  };

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <View className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
        <Text className="text-xs font-normal text-gray-500 dark:text-gray-400">
          {t("representative")}: {representativeName ?? "—"}
        </Text>
        <Text className="mt-0.5 text-2xl font-bold text-gray-950 dark:text-gray-50">
          {item.headName}
        </Text>
        <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
          {item.groupCode} · {t("member_count", { count: members.length })}
        </Text>
      </View>

      {householdIsActive && (
        <View className="p-4">
          <Host style={{ width: "100%", height: 48 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              colors={{ containerColor: "#14532d", contentColor: "#ffffff" }}
              onClick={() =>
                router.push({
                  pathname: "/(protected)/(app)/case-management/members/create",
                  params: { householdId: id, uuid, household },
                })
              }
            >
              <JCText>{t("add_member")}</JCText>
            </Button>
          </Host>
        </View>
      )}

      <FlatList
        data={members}
        keyExtractor={(member) => member.uuid ?? member.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="px-4 py-10">
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t("no_household_members_recorded")}
            </Text>
          </View>
        }
        renderItem={({ item: member, index }) => {
          const profileCompletion = getHouseholdMemberProfileCompletion(member);
          const roleLabel = getHouseholdMemberRoleLabel(member, t);
          const isPrimaryRole = member.isHead || member.isRepresentative;

          return (
            <Pressable
              onPress={() => handleShowMember(member)}
              accessibilityRole="button"
              accessibilityLabel={t("view_member_profile_complete", {
                name: member.fullName ?? t("member"),
                percentage: profileCompletion.percentage,
              })}
              className="flex-row items-center gap-3 px-4 py-4 focus:bg-pressed active:bg-pressed"
              style={index === members.length - 1 ? undefined : rowSeparatorStyle}
            >
              <View className="size-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
                  {getHouseholdMemberInitials(member.fullName)}
                </Text>
              </View>

              <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <View
                      className={
                        isPrimaryRole
                          ? "size-1.5 rounded-full bg-emerald-600"
                          : "size-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                      }
                    />
                    <Text
                      className={
                        isPrimaryRole
                          ? "text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                          : "text-[10px] font-semibold text-gray-700 dark:text-gray-300"
                      }
                    >
                      {roleLabel}
                    </Text>
                  </View>
                  {!member.isActive && (
                    <View className="rounded-full bg-red-100 px-2 py-0.5 dark:bg-red-950">
                      <Text className="text-[10px] font-semibold text-red-700 dark:text-red-300">
                        {t("inactive")}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  <Text
                    numberOfLines={1}
                    className="min-w-0 flex-1 text-base font-semibold text-gray-950 dark:text-gray-50"
                  >
                    {member.fullName}
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {formatHouseholdMemberRowSummary(member, t)}
                </Text>
                {!member.isActive && member.deactivationReason && (
                  <Text className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {t("reason")}: {translateDeactivationReason(t, member.deactivationReason)}
                  </Text>
                )}
              </View>

              <View className="items-center">
                <ProgressRing
                  progress={profileCompletion.percentage}
                  size={42}
                  strokeWidth={5}
                  color={getProfileCompletionColor(profileCompletion.percentage)}
                  trackColor="#e5e7eb"
                >
                  <Text
                    className="text-[9px] font-semibold text-gray-950 dark:text-gray-50"
                    numberOfLines={1}
                  >
                    {profileCompletion.percentage}%
                  </Text>
                </ProgressRing>
              </View>

              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          );
        }}
      />
    </StyledSafeAreaView>
  );
}
