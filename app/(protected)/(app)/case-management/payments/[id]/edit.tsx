import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { eq, isNull, useLiveQuery } from "@tanstack/react-db";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, LockKeyhole, TriangleAlert } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Input from "@/src/components/form/input";
import SegmentedPicker from "@/src/components/form/segmented-picker";
import Select from "@/src/components/form/select";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translatePaymentNumberChangeReason } from "@/src/i18n/helpers";
import { goBackOrReplace } from "@/src/lib/navigation";
import {
  buildPaymentNumberChangeAuditPayload,
  getPaymentAccountChangeReasons,
  isPaymentAccountIdentifierChange,
  resolveRegisteredPaymentName,
  type PaymentAccountChangeReason,
} from "@/src/lib/payment-phone-update";
import {
  householdPaymentHistoryCollection,
  paymentAccountsCollection,
} from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest, upsertPaymentAccount } from "@/src/powersync/mutations";
import { useSession } from "@/src/providers/session-context";

type Provider = { name: string; color: string; prefix?: readonly string[] };

const mnoProviders: Provider[] = [
  {
    name: "MIXX",
    prefix: ["065", "067", "071", "077", "25565", "25567", "25571", "25577"],
    color: "#00377D",
  },
  {
    name: "M-PESA",
    prefix: ["074", "075", "076", "079", "25574", "25575", "25576", "25579"],
    color: "#BD0808",
  },
  {
    name: "Airtel Money",
    prefix: ["078", "068", "069", "25578", "25568", "25569"],
    color: "#E40001",
  },
  {
    name: "HaloPesa",
    prefix: ["061", "062", "25561", "25562"],
    color: "#F47920",
  },
  {
    name: "T-Pesa",
    prefix: ["073", "25573"],
    color: "#FECF0B",
  },
];

const bankProviders: Provider[] = [
  { name: "CRDB", color: "#48B048" },
  { name: "NMB", color: "#1F5AA6" },
  { name: "NBC", color: "#003A8F" },
  { name: "DTB", color: "#E5003A" },
  { name: "Equity", color: "#B00020" },
  { name: "PBZ", color: "#0072BC" },
];

const MNO_IMAGES: Record<string, any> = {
  MIXX: require("@/assets/mno/mixx.png"),
  "M-PESA": require("@/assets/mno/m-pesa.png"),
  "Airtel Money": require("@/assets/mno/airtel-money.png"),
  HaloPesa: require("@/assets/mno/halopesa.png"),
  "T-Pesa": require("@/assets/mno/t-pesa.png"),
};

const BANK_IMAGES: Record<string, any> = {
  CRDB: require("@/assets/banks/crdb.png"),
  NMB: require("@/assets/banks/nmb.png"),
  NBC: require("@/assets/banks/nbc.png"),
  DTB: require("@/assets/banks/dtb.png"),
  Equity: require("@/assets/banks/equity.png"),
  PBZ: require("@/assets/banks/pbz.png"),
};

const ACCOUNT_TYPES = ["MNO", "BANK"] as const;

type AccountType = (typeof ACCOUNT_TYPES)[number];

type FormValues = {
  accountType: AccountType;
  provider: string;
  accountNumber: string;
  registeredName: string;
  householdId: string;
  householdUuid: string;
  changeReason: PaymentAccountChangeReason | "";
};

type HouseholdUpdateFormProps = {
  showChangeReasonInitially?: boolean;
};

function findProviderOption(providerName: string | null | undefined): Provider | null {
  const normalizedProvider = providerName?.trim().toLowerCase();
  if (!normalizedProvider) return null;

  return (
    [...mnoProviders, ...bankProviders].find(
      (provider) => provider.name.toLowerCase() === normalizedProvider,
    ) ?? null
  );
}

function getAccountTypeForProvider(providerName: string | null | undefined): AccountType {
  const provider = findProviderOption(providerName);
  if (!provider) return "MNO";

  return bankProviders.some((bankProvider) => bankProvider.name === provider.name) ? "BANK" : "MNO";
}

export async function savePaymentInfo(
  form: {
    provider: string;
    accountNumber: string;
    registeredName: string;
    householdUuid: string;
  },
  changedAt = new Date().toISOString(),
) {
  try {
    const deactivationTxs = paymentAccountsCollection.toArray
      .filter(
        (account) =>
          account.houseHoldId === form.householdUuid &&
          Number(account.isActive) === 1 &&
          !account.deletedAt,
      )
      .map((account) =>
        paymentAccountsCollection.update(account.id, {}, (draft) => {
          draft.isActive = 0;
          draft.synchronizedAt = null;
          draft.updatedAt = changedAt;
        }),
      );

    const insertTx = upsertPaymentAccount({
      houseHoldId: form.householdUuid,
      accountProvider: form.provider.trim(),
      accountNumber: form.accountNumber.trim(),
      accountName: form.registeredName.trim(),
    });

    await Promise.all([
      ...deactivationTxs.map((tx) => tx.isPersisted.promise),
      insertTx.isPersisted.promise,
    ]);
  } catch (error) {
    console.error("Error saving payment info:", error);
    throw error;
  }
}

function validateAccountNumber(
  value: string,
  accountType: "MNO" | "BANK",
  providerName: string,
  t: (key: string, options?: any) => string,
): string | undefined {
  const fieldLabel = accountType === "MNO" ? t("mobile_number_lower") : t("account_number_lower");

  if (!value) return t("field_required", { field: fieldLabel });

  if (accountType === "MNO") {
    const provider = mnoProviders.find((p) => p.name === providerName);
    if (!provider) return t("select_provider_before_mobile_number");
    const cleaned = value.replace(/\s+/g, "");
    const is255 = cleaned.startsWith("255");
    const prefixMatch = provider.prefix?.some((p) => cleaned.startsWith(p)) ?? false;
    const lengthOk = is255 ? cleaned.length === 12 : cleaned.length === 10;
    if (!prefixMatch || !lengthOk)
      return t("mobile_number_invalid_provider", {
        provider: provider.name,
        format: is255 ? "255XXXXXXXXX" : "0XXXXXXXXX",
      });
  }

  if (accountType === "BANK" && value.trim().length < 5) {
    return t("account_number_min_length");
  }

  return undefined;
}

export default function HouseholdUpdateForm({
  showChangeReasonInitially = false,
}: HouseholdUpdateFormProps = {}) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { user } = useSession();
  const { id, household, uuid } = useLocalSearchParams<{
    id: string;
    uuid: string;
    household: string;
  }>();

  const router = useRouter();

  const item = useMemo(() => {
    try {
      return household ? JSON.parse(household) : null;
    } catch (e) {
      console.error("Failed to parse household params:", e);
      return null;
    }
  }, [household]);
  const householdUuid = uuid ?? (item?.uuid as string | null | undefined) ?? "";

  const { data: currentPaymentAccounts = [], isLoading: isPaymentAccountLoading } = useLiveQuery(
    (q) =>
      q
        .from({ account: paymentAccountsCollection })
        .where(({ account }) => eq(account.houseHoldId, householdUuid))
        .where(({ account }) => isNull(account.deletedAt))
        .orderBy(({ account }) => account.isActive, "desc")
        .orderBy(({ account }) => account.updatedAt, "desc")
        .orderBy(({ account }) => account.createdAt, "desc")
        .limit(1),
    [householdUuid],
  );

  const currentPaymentAccount = currentPaymentAccounts[0];
  const providerOption = findProviderOption(
    currentPaymentAccount?.accountProvider ?? (item?.accountProvider as string | null | undefined),
  );
  const hasPaymentAccount = Boolean(providerOption);
  const initialProvider = providerOption?.name ?? "";
  const initialAccountType = getAccountTypeForProvider(
    currentPaymentAccount?.accountProvider ?? (item?.accountProvider as string | null | undefined),
  );
  const initialAccountNumber = hasPaymentAccount
    ? (currentPaymentAccount?.accountNumber ??
      (item?.accountNumber as string | null | undefined) ??
      "")
    : "";
  const routeHasPaymentRegistration = Boolean(item?.hasPaymentDetails || item?.accountUuid);
  const registeredPaymentName = resolveRegisteredPaymentName({
    currentAccountName: currentPaymentAccount?.accountName,
    routeAccountName: item?.accountName as string | null | undefined,
    hasRoutePaymentRegistration: routeHasPaymentRegistration,
    householdHeadName: item?.headName as string | null | undefined,
  });

  const { data: paymentHistory = [], isLoading: isPaymentHistoryLoading } = useLiveQuery(
    (q) =>
      q
        .from({ payment: householdPaymentHistoryCollection })
        .where(({ payment }) => eq(payment.householdUuid, householdUuid))
        .where(({ payment }) => isNull(payment.deletedAt))
        .orderBy(({ payment }) => payment.createdAt, "desc"),
    [householdUuid],
  );

  // TODO: Replace the route placeholder with the API-provided payment-history flag.
  const hasProtectedPaymentHistory =
    paymentHistory.length > 0 || Boolean(item?.needsPaymentDataUpdate);
  const protectedPaymentCount = paymentHistory.length || (item?.needsPaymentDataUpdate ? 1 : 0);
  const showsPaymentHistoryWarning = hasPaymentAccount && hasProtectedPaymentHistory;
  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!user) {
        throw new Error("A signed-in user is required to update household payment numbers.");
      }

      const paymentIdentifierChanged = isPaymentAccountIdentifierChange({
        initialAccountType,
        initialProvider,
        initialAccountNumber,
        nextAccountType: data.accountType,
        nextProvider: data.provider,
        nextAccountNumber: data.accountNumber,
      });
      const changeReason = data.changeReason;
      const changedAt = new Date().toISOString();

      if (paymentIdentifierChanged) {
        if (!changeReason) {
          throw new Error("A reason is required when changing a payment account.");
        }
      }

      await savePaymentInfo(
        {
          ...data,
          registeredName: registeredPaymentName,
        },
        changedAt,
      );

      if (paymentIdentifierChanged && changeReason) {
        const auditTx = enqueueHouseholdChangeRequest({
          householdUuid: data.householdUuid,
          type: "payment_phone_updated",
          payload: buildPaymentNumberChangeAuditPayload({
            previous: {
              provider: providerOption?.name ?? "",
              accountNumber: initialAccountNumber,
              registeredName: registeredPaymentName,
            },
            next: {
              provider: data.provider,
              accountNumber: data.accountNumber,
              registeredName: registeredPaymentName,
            },
            reason: changeReason,
            remarks: null,
            changedAt,
            changedBy: {
              id: user.id,
              reference: user.reference ?? null,
              username: user.username ?? null,
              name: user.fullName,
            },
            paymentCount: protectedPaymentCount,
          }),
        });
        await auditTx.isPersisted.promise;
      }

      return paymentIdentifierChanged;
    },
    onError: () => {
      Alert.alert(t("error"), t("failed_save_payment_details"));
    },
    onSuccess: (paymentIdentifierChanged) => {
      if (paymentIdentifierChanged) {
        Alert.alert(t("saved"), t("payment_phone_updated_successfully"), [
          { text: t("ok"), onPress: () => goBackOrReplace(router, "/case-management") },
        ]);
        return;
      }

      goBackOrReplace(router, "/case-management");
    },
  });

  const form = useForm({
    defaultValues: {
      accountType: initialAccountType,
      provider: initialProvider,
      accountNumber: initialAccountNumber,
      registeredName: registeredPaymentName,
      householdId: id ?? String(item?.id ?? ""),
      householdUuid,
      changeReason: "",
    } satisfies FormValues,
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    },
  });

  if (!item) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Text className="text-lg text-red-600 dark:text-red-400">
          {t("household_data_not_found")}
        </Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <View className="border-b border-gray-200 px-4 pt-4 pb-2 dark:border-gray-800">
        <Text className="text-left text-2xl font-bold text-gray-950 dark:text-gray-50">
          {item.headName}
        </Text>
        <Text className="text-left text-sm font-normal text-gray-600 dark:text-gray-400">
          {item.groupCode}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
        >
          {/* Account type segmented picker + provider grid */}
          <form.Field name="accountType">
            {(accountTypeField) => (
              <form.Field
                name="provider"
                validators={{
                  onSubmit: ({ value }) =>
                    !value ? t("select_payment_provider_continue") : undefined,
                }}
              >
                {(providerField) => {
                  const currentCategory = accountTypeField.state.value;
                  const providers = currentCategory === "MNO" ? mnoProviders : bankProviders;
                  const selectedIndex = ACCOUNT_TYPES.indexOf(currentCategory);

                  // Chunk into rows of 3 (3 columns)
                  const rows: Provider[][] = [];
                  for (let i = 0; i < providers.length; i += 3) {
                    rows.push(providers.slice(i, i + 3));
                  }

                  return (
                    <View className="mb-8 gap-4">
                      {/* Segmented picker */}
                      <View className="w-full">
                        <SegmentedPicker
                          options={["MNO", "BANK"]}
                          selectedIndex={selectedIndex}
                          fullWidth
                          onOptionSelected={(index) => {
                            accountTypeField.handleChange(ACCOUNT_TYPES[index] ?? "MNO");
                            providerField.handleChange("");
                            form.setFieldValue("changeReason", "");
                          }}
                        />
                      </View>

                      {/* Provider grid — explicit rows so each item is always flex:1 + aspectRatio:1 */}
                      <View className="gap-3">
                        {rows.map((row, rowIndex) => (
                          <View key={rowIndex} className="flex-row gap-3">
                            {row.map((prov) => {
                              const isSelected = providerField.state.value === prov.name;
                              const logo =
                                currentCategory === "MNO"
                                  ? MNO_IMAGES[prov.name]
                                  : BANK_IMAGES[prov.name];

                              return (
                                <Pressable
                                  key={prov.name}
                                  onPress={() => providerField.handleChange(prov.name)}
                                  className="relative items-center justify-center overflow-hidden rounded-2xl"
                                  style={{
                                    flex: 1,
                                    aspectRatio: 1,
                                    backgroundColor: isSelected
                                      ? `${prov.color}dd`
                                      : `${prov.color}28`,
                                    borderWidth: isSelected ? 2 : 0,
                                    borderColor: isSelected ? prov.color : "transparent",
                                  }}
                                >
                                  {logo ? (
                                    <Image
                                      source={logo}
                                      style={{ width: "100%", height: "100%" }}
                                      resizeMode="contain"
                                    />
                                  ) : (
                                    <Text
                                      className="text-center text-base font-bold"
                                      style={{ color: isSelected ? "#fff" : prov.color }}
                                    >
                                      {prov.name}
                                    </Text>
                                  )}

                                  {isSelected && (
                                    <View className="absolute top-2 right-2 rounded-full bg-white/30 p-0.5">
                                      <Check size={14} color="#fff" />
                                    </View>
                                  )}
                                </Pressable>
                              );
                            })}

                            {/* Fill empty slots in the last row */}
                            {row.length < 3 &&
                              Array.from({ length: 3 - row.length }).map((_, i) => (
                                <View key={`spacer-${i}`} style={{ flex: 1 }} />
                              ))}
                          </View>
                        ))}
                      </View>

                      {providerField.state.meta.isTouched &&
                        providerField.state.meta.errors.length > 0 && (
                          <Text className="text-sm text-red-600 dark:text-red-400">
                            {providerField.state.meta.errors[0]}
                          </Text>
                        )}
                    </View>
                  );
                }}
              </form.Field>
            )}
          </form.Field>

          {/* Account number */}
          {showsPaymentHistoryWarning && (
            <form.Subscribe selector={(state) => state.values.accountType}>
              {(accountType) => {
                const isMno = accountType === "MNO";

                return (
                  <View className="mb-4 flex-row items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/60">
                    <TriangleAlert
                      size={18}
                      color={isDark ? "#fcd34d" : "#b45309"}
                      style={{ marginTop: 1 }}
                    />
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {t(
                          isMno
                            ? "mno_payment_has_history_warning"
                            : "bank_payment_has_history_warning",
                        )}
                      </Text>
                      <Text className="text-xs leading-4 text-amber-800 dark:text-amber-200">
                        {t(
                          isMno
                            ? "mno_payment_has_history_warning_hint"
                            : "bank_payment_has_history_warning_hint",
                          { count: protectedPaymentCount },
                        )}
                      </Text>
                    </View>
                  </View>
                );
              }}
            </form.Subscribe>
          )}

          <form.Field
            name="accountNumber"
            validators={{
              onBlur: ({ value, fieldApi }) => {
                const accountType = fieldApi.form.getFieldValue("accountType");
                const provider = fieldApi.form.getFieldValue("provider");
                return validateAccountNumber(value, accountType, provider, t);
              },
              onSubmit: ({ value, fieldApi }) => {
                const accountType = fieldApi.form.getFieldValue("accountType");
                const provider = fieldApi.form.getFieldValue("provider");
                return validateAccountNumber(value, accountType, provider, t);
              },
            }}
          >
            {(field) => (
              <form.Subscribe selector={(state) => state.values.accountType}>
                {(accountType) => (
                  <View className="mb-6 gap-2">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {accountType === "MNO" ? t("mobile_number") : t("account_number")}
                    </Text>
                    <Input
                      value={field.state.value}
                      onChangeText={(text) => {
                        const maxLen = accountType === "MNO" ? 12 : 20;
                        if (text.length > maxLen) return;
                        field.handleChange(text);
                      }}
                      onBlur={field.handleBlur}
                      keyboardType="phone-pad"
                      placeholder={accountType === "MNO" ? "e.g. 075x xxx xxx" : "e.g. 0123456789"}
                      maxLength={accountType === "MNO" ? 12 : 20}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {field.state.meta.errors[0]}
                      </Text>
                    )}
                  </View>
                )}
              </form.Subscribe>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) =>
              [state.values.accountType, state.values.provider, state.values.accountNumber] as const
            }
          >
            {([accountType, provider, accountNumber]) => {
              const isPaymentIdentifierChange = isPaymentAccountIdentifierChange({
                initialAccountType,
                initialProvider,
                initialAccountNumber,
                nextAccountType: accountType,
                nextProvider: provider,
                nextAccountNumber: String(accountNumber),
              });
              const changeReasons = getPaymentAccountChangeReasons(accountType);

              if (!showChangeReasonInitially && !isPaymentIdentifierChange) return null;

              return (
                <View className="mb-6 gap-4">
                  <form.Field
                    name="changeReason"
                    validators={{
                      onChange: ({ value }) => (value ? undefined : t("reason_required")),
                      onSubmit: ({ value }) => (value ? undefined : t("reason_required")),
                    }}
                  >
                    {(field) => (
                      <View className="gap-2">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("payment_number_change_reason")} *
                        </Text>
                        <Select
                          value={field.state.value || undefined}
                          onValueChange={field.handleChange}
                          placeholder={t("select_payment_number_change_reason")}
                        >
                          {changeReasons.map((reason) => (
                            <Select.Option key={reason} item={reason}>
                              {translatePaymentNumberChangeReason(t, reason)}
                            </Select.Option>
                          ))}
                        </Select>
                        {field.state.meta.errors.length > 0 && (
                          <Text className="text-sm text-red-600 dark:text-red-400">
                            {field.state.meta.errors[0]}
                          </Text>
                        )}
                      </View>
                    )}
                  </form.Field>

                </View>
              );
            }}
          </form.Subscribe>

          {/* Registered name from the payment provider registration record */}
          <View className="mb-8 gap-2">
            <View className="flex-row items-center gap-2">
              <LockKeyhole size={15} color={isDark ? "#9ca3af" : "#4b5563"} />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("registered_payment_name_read_only")}
              </Text>
            </View>
            <Input
              value={registeredPaymentName}
              placeholder={t("registered_payment_name_unavailable")}
              editable={false}
              readOnly
              accessibilityLabel={t("registered_payment_name_read_only")}
              accessibilityHint={t("registered_payment_name_source_hint")}
              className="text-gray-700 dark:text-gray-300"
            />
            <Text className="text-xs leading-4 text-gray-500 dark:text-gray-400">
              {t("registered_payment_name_source_hint")}
            </Text>
          </View>
        </ScrollView>

        <View className="p-4">
          <form.Subscribe
            selector={(state) =>
              [
                state.canSubmit,
                state.isSubmitting,
                state.values.accountType,
                state.values.provider,
                state.values.accountNumber,
              ] as const
            }
          >
            {([canSubmit, isSubmitting, accountType, provider, accountNumber]) => {
              const isPaymentIdentifierChange = isPaymentAccountIdentifierChange({
                initialAccountType,
                initialProvider,
                initialAccountNumber,
                nextAccountType: accountType,
                nextProvider: provider,
                nextAccountNumber: String(accountNumber),
              });

              return (
                <Host style={{ width: "100%", height: 44 }}>
                  <Button
                    modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                    onClick={() => form.handleSubmit()}
                    enabled={
                      Boolean(canSubmit) &&
                      !isSubmitting &&
                      !mutation.isPending &&
                      !isPaymentHistoryLoading &&
                      !isPaymentAccountLoading
                    }
                    colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
                  >
                    <JCText>
                      {mutation.isPending
                        ? t("saving")
                        : isPaymentIdentifierChange
                          ? t("update_payment_number")
                          : t("save_changes")}
                    </JCText>
                  </Button>
                </Host>
              );
            }}
          </form.Subscribe>
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
