import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { zodResolver } from "@hookform/resolvers/zod";
import { eq, isNull, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as z from "zod";

import Select from "@/src/components/form/select";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translateDeactivationReason } from "@/src/i18n/helpers";
import { MEMBER_DEACTIVATION_REASONS } from "@/src/lib/household-case-management";
import { goBackOrReplace } from "@/src/lib/navigation";
import { householdMembersCollection, householdsCollection } from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";
import {
  formatHouseholdMemberRowSummary,
  type HouseholdMember,
} from "@/src/utils/household-member";
import {
  getHouseholdRepresentativeDisplayName,
  isHouseholdRepresentative,
  sortHouseholdRepresentativeCandidates,
} from "@/src/utils/household-representative";

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    reason: z.enum(MEMBER_DEACTIVATION_REASONS, { error: t("reason_required") }),
    replacementRepresentativeUuid: z.string().optional(),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function HouseholdMemberDeactivate() {
  const { t } = useTranslation();
  const { id, uuid, household, memberUuid, member } = useLocalSearchParams<{
    id?: string;
    uuid?: string;
    household?: string;
    memberUuid?: string;
    member?: string;
  }>();
  const router = useRouter();
  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const routeHouseholdItem = useMemo(() => {
    try {
      return household ? JSON.parse(household) : null;
    } catch {
      return null;
    }
  }, [household]);

  const routeMember = useMemo<HouseholdMember | null>(() => {
    try {
      return member ? JSON.parse(member) : null;
    } catch {
      return null;
    }
  }, [member]);

  const householdUuid = uuid ?? routeHouseholdItem?.uuid ?? "";
  const resolvedMemberUuid = memberUuid ?? id ?? routeMember?.uuid ?? "";
  const { data: memberRows = [] } = useLiveQuery(
    (q) =>
      q
        .from({ member: householdMembersCollection })
        .where(({ member }) => eq(member.uuid, resolvedMemberUuid))
        .orderBy(({ member }) => member.id, "asc")
        .limit(1),
    [resolvedMemberUuid],
  );

  const { data: householdRows = [] } = useLiveQuery(
    (q) =>
      q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.uuid, householdUuid || "__missing_household__"))
        .orderBy(({ household }) => household.id, "asc")
        .limit(1),
    [householdUuid],
  );

  const { data: householdMembers = [] } = useLiveQuery(
    (q) =>
      q
        .from({ member: householdMembersCollection })
        .where(({ member }) => eq(member.householdUuid, householdUuid))
        .where(({ member }) => isNull(member.deletedAt)),
    [householdUuid],
  );

  const householdRow = householdRows[0] ?? null;
  const householdItem = householdRow
    ? {
        ...routeHouseholdItem,
        id: householdRow.id,
        uuid: householdRow.uuid,
        headName: householdRow.headName,
        representativeName: householdRow.representativeName,
        groupCode: householdRow.groupCode,
        status: householdRow.caseStatus,
      }
    : routeHouseholdItem;
  const representativeName = getHouseholdRepresentativeDisplayName(householdItem ?? {});
  const currentMember = memberRows[0] ?? routeMember;
  const requiresRepresentativeReplacement = Boolean(
    currentMember &&
    householdItem &&
    isHouseholdRepresentative(currentMember, representativeName, householdItem.headName),
  );
  const currentMemberUuid = currentMember?.uuid ?? currentMember?.id ?? null;
  const replacementCandidates = sortHouseholdRepresentativeCandidates(
    householdMembers.filter(
      (candidate) => candidate.isActive && (candidate.uuid ?? candidate.id) !== currentMemberUuid,
    ),
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: undefined, replacementRepresentativeUuid: "" },
    mode: "onChange",
  });
  const replacementRepresentativeUuid = useWatch({
    control,
    name: "replacementRepresentativeUuid",
  });
  const canDeactivate =
    Boolean(currentMember?.isActive) &&
    isValid &&
    (!requiresRepresentativeReplacement ||
      Boolean(replacementRepresentativeUuid && replacementCandidates.length > 0));
  const warningMessages = [
    t("deactivated_members_remain_visible"),
    ...(requiresRepresentativeReplacement
      ? [t("current_representative_requires_replacement")]
      : []),
  ];

  if (!householdItem || !householdUuid || !currentMember) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">{t("household_member_data_not_found")}</Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </StyledSafeAreaView>
    );
  }

  const onSubmit = (data: FormData) => {
    const replacementRepresentative = requiresRepresentativeReplacement
      ? replacementCandidates.find(
          (candidate) => (candidate.uuid ?? candidate.id) === data.replacementRepresentativeUuid,
        )
      : null;

    if (requiresRepresentativeReplacement && !replacementRepresentative) {
      Alert.alert(t("new_representative_required"), t("select_new_representative_first"));
      return;
    }

    Alert.alert(
      t("deactivate_member"),
      replacementRepresentative
        ? t("deactivate_member_reassign_confirmation", {
            member: currentMember.fullName,
            representative: replacementRepresentative.fullName,
          })
        : t("deactivate_member_confirmation", { member: currentMember.fullName }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("deactivate"),
          style: "destructive",
          onPress: async () => {
            const now = new Date().toISOString();

            try {
              const currentTx = householdMembersCollection.update(currentMember.id, (draft) => {
                draft.isActive = 0;
                draft.isRepresentative = 0;
                draft.deactivationReason = data.reason;
                draft.updatedAt = now;
              });
              await currentTx.isPersisted.promise;

              if (replacementRepresentative) {
                const householdTx = householdsCollection.update(householdUuid, (draft) => {
                  draft.representativeName = replacementRepresentative.fullName;
                  draft.updatedAt = now;
                });
                await householdTx.isPersisted.promise;

                for (const member of householdMembers) {
                  if (member.deletedAt) continue;
                  const tx = householdMembersCollection.update(member.id, (draft) => {
                    draft.isRepresentative = member.id === replacementRepresentative.id ? 1 : 0;
                    draft.updatedAt =
                      member.id === replacementRepresentative.id ? now : draft.updatedAt;
                  });
                  await tx.isPersisted.promise;
                }

                const representativeChangeTx = enqueueHouseholdChangeRequest({
                  householdUuid,
                  memberUuid: replacementRepresentative.uuid ?? replacementRepresentative.id,
                  type: "household_details_update",
                  payload: {
                    representativeName: replacementRepresentative.fullName,
                    representativeMemberUuid:
                      replacementRepresentative.uuid ?? replacementRepresentative.id,
                    previous: {
                      representativeName,
                      representativeMemberUuid: currentMember.uuid ?? currentMember.id,
                    },
                    field: "representative",
                  },
                });
                await representativeChangeTx.isPersisted.promise;
              }

              const deactivateChangeTx = enqueueHouseholdChangeRequest({
                householdUuid,
                memberUuid: currentMember.uuid ?? currentMember.id,
                type: "member_deactivated",
                payload: {
                  memberUuid: currentMember.uuid ?? currentMember.id,
                  fullName: currentMember.fullName,
                  reason: data.reason,
                  deactivatedAt: now,
                  ...(replacementRepresentative
                    ? {
                        representativeReassigned: true,
                        replacementRepresentativeMemberUuid:
                          replacementRepresentative.uuid ?? replacementRepresentative.id,
                        replacementRepresentativeName: replacementRepresentative.fullName,
                      }
                    : {}),
                },
              });
              await deactivateChangeTx.isPersisted.promise;

              Alert.alert(
                t("saved"),
                replacementRepresentative
                  ? t("household_member_deactivated_reassigned_successfully")
                  : t("household_member_deactivated_successfully"),
                [
                  {
                    text: t("ok"),
                    onPress: () => goBackOrReplace(router, "/case-management"),
                  },
                ],
              );
            } catch (error) {
              console.error("[Member Deactivate] Failed:", error);
              Alert.alert(t("error"), t("failed_deactivate_household_member"));
            }
          },
        },
      ],
    );
  };

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
          <View className="border-b border-gray-200 pb-4 dark:border-gray-800">
            <Text className="text-2xl font-bold text-gray-950 dark:text-gray-50">{currentMember.fullName}</Text>
            <Text className="mt-1 text-sm font-normal text-gray-600 dark:text-gray-400">
              {householdItem.groupCode} · {formatHouseholdMemberRowSummary(currentMember, t)}
            </Text>
          </View>

          <View className="flex-row gap-3 rounded-2xl bg-red-50 px-4 py-4 dark:bg-red-950/40">
            <TriangleAlert size={16} color="#dc2626" strokeWidth={2.25} style={{ marginTop: 2 }} />
            <View className="flex-1">
              {warningMessages.map((message, index) => (
                <View
                  key={message}
                  className={index === 0 ? undefined : "mt-3 border-t border-red-100 pt-3"}
                >
                  <Text className="text-sm font-normal text-red-700 dark:text-red-300">{message}</Text>
                </View>
              ))}
            </View>
          </View>

          <Controller
            control={control}
            name="reason"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("reason")}</Text>
                <Select
                  value={value}
                  onValueChange={onChange}
                  placeholder={t("select_deactivation_reason")}
                >
                  {MEMBER_DEACTIVATION_REASONS.map((reason) => (
                    <Select.Option key={reason} item={reason}>
                      {translateDeactivationReason(t, reason)}
                    </Select.Option>
                  ))}
                </Select>
                {errors.reason && (
                  <Text className="text-sm text-red-600 dark:text-red-400">{errors.reason.message}</Text>
                )}
              </View>
            )}
          />

          {requiresRepresentativeReplacement && (
            <Controller
              control={control}
              name="replacementRepresentativeUuid"
              render={({ field: { onChange, value } }) => {
                const selectedMember = replacementCandidates.find(
                  (candidate) => candidate.uuid === value,
                );

                return (
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("new_representative")}
                    </Text>
                    <Select
                      value={value || undefined}
                      onValueChange={onChange}
                      placeholder={
                        replacementCandidates.length
                          ? t("select_new_household_representative")
                          : t("no_active_replacement_available")
                      }
                      disabled={replacementCandidates.length === 0}
                    >
                      {replacementCandidates.map((candidate) => (
                        <Select.Option key={candidate.uuid} item={candidate.uuid}>
                          {candidate.fullName}
                        </Select.Option>
                      ))}
                    </Select>
                    {selectedMember && (
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {formatHouseholdMemberRowSummary(selectedMember, t)}
                      </Text>
                    )}
                    {replacementCandidates.length === 0 ? (
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {t("add_another_active_member_before_deactivation")}
                      </Text>
                    ) : !value ? (
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {t("new_representative_required_before_deactivation")}
                      </Text>
                    ) : null}
                    {errors.replacementRepresentativeUuid && (
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {errors.replacementRepresentativeUuid.message}
                      </Text>
                    )}
                  </View>
                );
              }}
            />
          )}
        </ScrollView>

        <View className="p-4">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              onClick={handleSubmit(onSubmit)}
              enabled={canDeactivate}
              colors={{ containerColor: "#dc2626", contentColor: "#ffffff" }}
            >
              <JCText>{t("deactivate_member")}</JCText>
            </Button>
          </Host>
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
