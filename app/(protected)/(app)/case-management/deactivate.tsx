import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { HOUSEHOLD_DEACTIVATION_REASONS } from "@/src/lib/household-case-management";
import { goBackOrReplace } from "@/src/lib/navigation";
import { householdsCollection } from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    reason: z.enum(HOUSEHOLD_DEACTIVATION_REASONS, { error: t("reason_required") }),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function HouseholdDeactivate() {
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

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: undefined },
    mode: "onChange",
  });

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

  const onSubmit = (data: FormData) => {
    Alert.alert(t("deactivate_household"), t("deactivate_household_confirmation"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deactivate"),
        style: "destructive",
        onPress: async () => {
          const now = new Date().toISOString();

          try {
            const householdTx = householdsCollection.update(uuid, (draft) => {
              draft.caseStatus = "inactive";
              draft.deactivationReason = data.reason;
              draft.deactivatedAt = now;
              draft.updatedAt = now;
            });
            await householdTx.isPersisted.promise;

            const changeTx = enqueueHouseholdChangeRequest({
              householdUuid: uuid,
              type: "household_deactivated",
              payload: {
                reason: data.reason,
                deactivatedAt: now,
                household: {
                  uuid,
                  headName: item.headName,
                  representativeName: item.representativeName ?? null,
                  groupCode: item.groupCode,
                },
              },
            });
            await changeTx.isPersisted.promise;

            goBackOrReplace(router, "/case-management");
          } catch (error) {
            console.error("[Household Deactivate] Failed:", error);
            Alert.alert(t("error"), t("failed_deactivate_household"));
          }
        },
      },
    ]);
  };

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
          <Text className="text-2xl font-bold text-gray-950 dark:text-gray-50">{item.headName}</Text>
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">{item.groupCode}</Text>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
          <View className="flex-row gap-3 rounded-2xl bg-red-50 px-4 py-4 dark:bg-red-950/40">
            <TriangleAlert size={16} color="#dc2626" strokeWidth={2.25} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-sm font-normal text-red-700 dark:text-red-300">
              {t("deactivated_households_remain_visible")}
            </Text>
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
                  {HOUSEHOLD_DEACTIVATION_REASONS.map((reason) => (
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
        </ScrollView>

        <View className="p-4">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              onClick={handleSubmit(onSubmit)}
              enabled={isValid}
              colors={{ containerColor: "#dc2626", contentColor: "#ffffff" }}
            >
              <JCText style={{ textAlign: "center" }}>{t("deactivate_household")}</JCText>
            </Button>
          </Host>
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
