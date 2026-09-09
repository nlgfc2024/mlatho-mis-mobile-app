import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { zodResolver } from "@hookform/resolvers/zod";
import { eq, isNull, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Info } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Pressable, Text, View } from "react-native";
import * as z from "zod";

import Select from "@/src/components/form/select";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { goBackOrReplace } from "@/src/lib/navigation";
import { householdMembersCollection, householdsCollection } from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";
import { formatHouseholdMemberRowSummary } from "@/src/utils/household-member";
import {
  getHouseholdRepresentativeDisplayName,
  isHouseholdRepresentative,
  sortHouseholdRepresentativeCandidates,
} from "@/src/utils/household-representative";

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    representativeUuid: z.string().min(1, t("select_household_representative")),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function HouseholdRepresentative() {
  const { t } = useTranslation();
  const { uuid, household } = useLocalSearchParams<{
    id: string;
    uuid: string;
    household: string;
  }>();
  const router = useRouter();
  const formSchema = useMemo(() => createFormSchema(t), [t]);

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
        .where(({ member }) => isNull(member.deletedAt)),
    [uuid],
  );

  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);
  const sortedMembers = useMemo(
    () => sortHouseholdRepresentativeCandidates(activeMembers),
    [activeMembers],
  );
  const representativeName = getHouseholdRepresentativeDisplayName(item ?? {});
  const currentRepresentative = useMemo(() => {
    return (
      members.find((member) =>
        isHouseholdRepresentative(member, representativeName, item?.headName),
      ) ?? null
    );
  }, [item?.headName, members, representativeName]);
  const currentRepresentativeUuid = currentRepresentative?.isActive
    ? (currentRepresentative.uuid ?? currentRepresentative.id)
    : "";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { representativeUuid: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (isDirty || !currentRepresentativeUuid) return;

    reset({ representativeUuid: currentRepresentativeUuid });
  }, [currentRepresentativeUuid, isDirty, reset]);

  if (!item || !uuid) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">{t("household_data_not_found")}</Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </StyledSafeAreaView>
    );
  }

  const onSubmit = async (data: FormData) => {
    const selectedMember = activeMembers.find(
      (member) => (member.uuid ?? member.id) === data.representativeUuid,
    );

    if (!selectedMember) {
      Alert.alert(t("error"), t("select_household_member_as_representative"));
      return;
    }

    try {
      const now = new Date().toISOString();
      const householdTx = householdsCollection.update(uuid, (draft) => {
        draft.representativeName = selectedMember.fullName;
        draft.updatedAt = now;
      });
      await householdTx.isPersisted.promise;

      for (const member of members) {
        if (member.deletedAt) continue;
        const tx = householdMembersCollection.update(member.id, (draft) => {
          draft.isRepresentative = member.id === selectedMember.id ? 1 : 0;
          draft.updatedAt = member.id === selectedMember.id ? now : draft.updatedAt;
        });
        await tx.isPersisted.promise;
      }

      const changeTx = enqueueHouseholdChangeRequest({
        householdUuid: uuid,
        memberUuid: selectedMember.uuid ?? selectedMember.id,
        type: "household_details_update",
        payload: {
          representativeName: selectedMember.fullName,
          representativeMemberUuid: selectedMember.uuid ?? selectedMember.id,
          previous: {
            representativeName: representativeName,
            representativeMemberUuid:
              currentRepresentative?.uuid ?? currentRepresentative?.id ?? null,
          },
          field: "representative",
        },
      });
      await changeTx.isPersisted.promise;

      Alert.alert(t("saved"), t("household_representative_updated_successfully"), [
        { text: t("ok"), onPress: () => goBackOrReplace(router, "/case-management") },
      ]);
    } catch (error) {
      console.error("[Household Representative] Failed:", error);
      Alert.alert(t("error"), t("failed_update_representative"));
    }
  };

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
          <Text className="text-xs font-normal text-gray-500 dark:text-gray-400">
            {t("representative")}: {representativeName ?? "—"}
          </Text>
          <Text className="mt-0.5 text-2xl font-bold text-gray-950 dark:text-gray-50">{item.headName}</Text>
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">{item.groupCode}</Text>
        </View>

        <View className="flex-1 gap-4 p-4">
          <View className="flex-row gap-3 rounded-2xl bg-blue-100 px-4 py-4 dark:bg-blue-950/40">
            <Info size={16} color="#2563eb" strokeWidth={2.25} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-sm font-normal text-blue-600 dark:text-blue-300">
              {t("representative_description")}
            </Text>
          </View>

          <Controller
            control={control}
            name="representativeUuid"
            render={({ field: { onChange, value } }) => {
              const selectedMember = activeMembers.find(
                (member) => (member.uuid ?? member.id) === value,
              );

              return (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("representative")}</Text>
                  <Select
                    value={value || undefined}
                    onValueChange={onChange}
                    placeholder={
                      sortedMembers.length
                        ? t("select_household_representative")
                        : t("no_active_household_members_available")
                    }
                    disabled={sortedMembers.length === 0}
                  >
                    {sortedMembers.map((member) => (
                      <Select.Option key={member.uuid ?? member.id} item={member.uuid ?? member.id}>
                        {member.fullName}
                      </Select.Option>
                    ))}
                  </Select>
                  {selectedMember && (
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {formatHouseholdMemberRowSummary(selectedMember, t)}
                    </Text>
                  )}
                  {sortedMembers.length === 0 && (
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {t("add_active_member_before_representative")}
                    </Text>
                  )}
                  {errors.representativeUuid && (
                    <Text className="text-sm text-red-600 dark:text-red-400">
                      {errors.representativeUuid.message}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        </View>

        <View className="p-4">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              onClick={handleSubmit(onSubmit)}
              enabled={isValid && isDirty && sortedMembers.length > 0}
              colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
            >
              <JCText>{t("save_changes")}</JCText>
            </Button>
          </Host>
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
