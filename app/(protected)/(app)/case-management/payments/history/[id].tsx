import { eq, isNull, useLiveQuery } from "@tanstack/react-db";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { Copy, History, Phone, ShieldCheck } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import {
  canAddPaymentFollowUp,
  isPreviousPaymentNumber,
  parsePaymentFollowUpPayload,
  type HouseholdPaymentTransaction,
  type PaymentFollowUpPayload,
} from "@/src/features/payments/household-payment-history";
import { getDateLocale, translateStatus } from "@/src/i18n/helpers";
import {
  householdChangeRequestsCollection,
  householdPaymentHistoryCollection,
} from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";
import { useSession } from "@/src/providers/session-context";

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(value.includes("T") ? { hour: "2-digit", minute: "2-digit", second: "2-digit" } : {}),
  }).format(date);
}

function formatAmount(value: number | null | undefined) {
  return `TZS ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)}`;
}

function DetailField({
  label,
  value,
  last,
}: {
  label: string;
  value: string | null | undefined;
  last?: boolean;
}) {
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  return (
    <View
      className="flex-row items-start justify-between gap-4 px-4 py-3.5"
      style={last ? undefined : rowSeparatorStyle}
    >
      <Text className="min-w-0 flex-1 text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      <Text
        selectable
        className="max-w-[58%] text-right text-sm font-medium text-gray-950 dark:text-gray-50"
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function DetailSection({
  title,
  fields,
}: {
  title: string;
  fields: { label: string; value: string | null | undefined }[];
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">{title}</Text>
      <View
        className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900"
        style={{ borderCurve: "continuous" }}
      >
        {fields.map((field, index) => (
          <DetailField
            key={field.label}
            label={field.label}
            value={field.value}
            last={index === fields.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

export default function PaymentTransactionDetails() {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { accessProfile, activeRole, user } = useSession();
  const {
    id,
    uuid: householdUuid = "",
    payment: serializedPayment,
    activePaymentPhoneNumber,
  } = useLocalSearchParams<{
    id: string;
    uuid: string;
    payment?: string;
    activePaymentPhoneNumber?: string;
  }>();
  const [remarks, setRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const routePayment = useMemo(() => {
    if (!serializedPayment) return null;
    try {
      return JSON.parse(serializedPayment) as HouseholdPaymentTransaction;
    } catch {
      return null;
    }
  }, [serializedPayment]);

  const { data: paymentRows = [], isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ payment: householdPaymentHistoryCollection })
        .where(({ payment }) => eq(payment.uuid, id))
        .where(({ payment }) => isNull(payment.deletedAt))
        .orderBy(({ payment }) => payment.updatedAt, "desc")
        .limit(1),
    [id],
  );

  const { data: followUpRows = [] } = useLiveQuery(
    (q) =>
      q
        .from({ request: householdChangeRequestsCollection })
        .where(({ request }) => eq(request.householdUuid, householdUuid))
        .where(({ request }) => eq(request.type, "payment_follow_up_added"))
        .where(({ request }) => isNull(request.deletedAt))
        .orderBy(({ request }) => request.createdAt, "desc"),
    [householdUuid],
  );

  const payment = (paymentRows[0] ?? routePayment) as HouseholdPaymentTransaction | null;
  const isPlaceholder = payment?.uuid?.startsWith("placeholder-") ?? false;
  const followUps = useMemo(
    () =>
      followUpRows
        .map((row) => parsePaymentFollowUpPayload(row.payload))
        .filter(
          (row): row is PaymentFollowUpPayload =>
            row !== null && row.transactionUuid === (payment?.uuid ?? payment?.id),
        ),
    [followUpRows, payment?.id, payment?.uuid],
  );
  const canAddRemark =
    !isPlaceholder && canAddPaymentFollowUp({ accessProfile, activeRole }) && Boolean(user);
  const previousNumber = isPreviousPaymentNumber(
    payment?.paymentPhoneNumber,
    activePaymentPhoneNumber,
  );
  const latestFollowUp = followUps[0] ?? null;
  const locale = getDateLocale(i18n.language);
  const sectionTopSeparatorStyle = useRowSeparatorStyle("top");

  const handleCopyReference = async () => {
    if (!payment?.transactionReference) return;
    await Clipboard.setStringAsync(payment.transactionReference);
    Alert.alert(t("copied"), t("transaction_reference_copied"));
  };

  const handleSaveRemark = async () => {
    const trimmedRemarks = remarks.trim();
    if (!payment || !trimmedRemarks || !user || !activeRole || !canAddRemark) return;

    const createdAt = new Date().toISOString();
    setIsSaving(true);
    try {
      const transaction = enqueueHouseholdChangeRequest({
        householdUuid,
        type: "payment_follow_up_added",
        payload: {
          transactionUuid: payment.uuid ?? payment.id ?? id,
          transactionReference: payment.transactionReference ?? null,
          status: "in_progress",
          remarks: trimmedRemarks,
          createdAt,
          createdBy: {
            id: user.id,
            reference: user.reference ?? null,
            username: user.username ?? null,
            name: user.fullName ?? null,
            roleId: activeRole.id,
            roleName: activeRole.name ?? null,
          },
        },
      });
      await transaction.isPersisted.promise;
      setRemarks("");
      Alert.alert(t("saved"), t("follow_up_remark_saved"));
    } catch {
      Alert.alert(t("error"), t("failed_save_follow_up_remark"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !payment) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator color="#0d542b" />
      </View>
    );
  }

  if (!payment) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-gray-50 px-6 dark:bg-gray-950">
        <History size={32} color="#9ca3af" />
        <Text className="text-center text-gray-600 dark:text-gray-300">
          {t("payment_transaction_not_found")}
        </Text>
      </View>
    );
  }

  const failureApplies =
    Boolean(payment.failureReason) ||
    ["failed", "rejected"].includes(payment.status?.toLowerCase() ?? "");
  const reversalApplies = Boolean(payment.reversalStatus || payment.reversalReference);
  const transactionFields = [
    { label: t("payment_cycle_or_period"), value: payment.paymentWindow },
    { label: t("payment_date_and_time"), value: formatDateTime(payment.paidAt, locale) },
    { label: t("payment_status"), value: translateStatus(t, payment.status) },
  ];
  const recipientFields = [
    { label: t("mno_or_payment_provider"), value: payment.provider },
    { label: t("payment_phone_number"), value: payment.paymentPhoneNumber },
    { label: t("registered_payment_name"), value: payment.registeredPaymentName },
    { label: t("recipient_or_beneficiary_name"), value: payment.recipientName },
    { label: t("payment_channel"), value: payment.paymentChannel },
  ];
  const processingFields = [
    ...(failureApplies
      ? [{ label: t("failure_or_rejection_reason"), value: payment.failureReason }]
      : []),
    ...(reversalApplies
      ? [
          { label: t("reversal_status"), value: payment.reversalStatus },
          { label: t("reversal_reference"), value: payment.reversalReference },
        ]
      : []),
    { label: t("processing_date"), value: formatDateTime(payment.processingDate, locale) },
    {
      label: t("last_status_update"),
      value: formatDateTime(payment.lastStatusUpdate ?? payment.updatedAt, locale),
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-gray-100 dark:bg-gray-950"
      contentContainerClassName="gap-8 p-4 pb-12"
    >
      <View className="gap-0 py-1">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text selectable className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {payment.transactionReference ?? "—"}
            </Text>
          </View>
          <Pressable
            onPress={handleCopyReference}
            disabled={!payment.transactionReference}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("copy_transaction_reference")}
            className="size-6 items-center justify-center rounded-full active:opacity-70"
          >
            <Copy size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
          </Pressable>
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <Text
            selectable
            className="text-2xl font-bold text-gray-950 dark:text-gray-50"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatAmount(payment.amount)}
          </Text>
          <View className="rounded-full bg-emerald-100 px-3 py-1.5 dark:bg-emerald-950">
            <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {translateStatus(t, payment.status)}
            </Text>
          </View>
        </View>
      </View>

      {previousNumber ? (
        <View className="flex-row items-start gap-3 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/50">
          <Phone size={18} color={isDark ? "#fcd34d" : "#92400e"} />
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {t("previous_payment_number")}
            </Text>
            <Text selectable className="text-xs leading-5 text-amber-800 dark:text-amber-200">
              {t("transaction_used_previous_payment_number", {
                transactionNumber: payment.paymentPhoneNumber ?? "—",
                activeNumber: activePaymentPhoneNumber ?? "—",
              })}
            </Text>
          </View>
        </View>
      ) : null}

      <DetailSection title={t("transaction_information")} fields={transactionFields} />
      <DetailSection title={t("recipient_and_channel")} fields={recipientFields} />
      <DetailSection title={t("processing_and_reconciliation")} fields={processingFields} />

      <View
        className="gap-4 overflow-hidden rounded-2xl bg-white py-4 dark:bg-gray-900"
        style={{ borderCurve: "continuous" }}
      >
        <View className="flex-row items-center justify-between gap-3 px-4">
          <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
            {t("follow_up")}
          </Text>
          <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {latestFollowUp
              ? translateStatus(t, latestFollowUp.status)
              : t("follow_up_not_started")}
          </Text>
        </View>

        {followUps.length ? (
          <View style={sectionTopSeparatorStyle}>
            {followUps.map((followUp, index) => (
              <FollowUpRow
                key={`${followUp.createdAt}-${index}`}
                followUp={followUp}
                locale={locale}
                last={index === followUps.length - 1}
              />
            ))}
          </View>
        ) : (
          <Text className="px-4 text-sm text-gray-500 dark:text-gray-400">
            {t("no_follow_up_remarks")}
          </Text>
        )}

        {canAddRemark ? (
          <View className="gap-3 px-4 pt-4" style={sectionTopSeparatorStyle}>
            <View className="flex-row items-center gap-2">
              <ShieldCheck size={16} color="#047857" />
              <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {t("authorized_follow_up")}
              </Text>
            </View>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              multiline
              maxLength={1_000}
              textAlignVertical="top"
              placeholder={t("add_follow_up_remarks")}
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              className="min-h-28 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-950 dark:bg-gray-800 dark:text-gray-50"
            />
            <Pressable
              onPress={handleSaveRemark}
              disabled={!remarks.trim() || isSaving}
              accessibilityRole="button"
              accessibilityState={{ disabled: !remarks.trim() || isSaving }}
              className={`items-center rounded-full py-3.5 ${
                remarks.trim() && !isSaving ? "bg-green-900" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <Text className="text-sm font-semibold text-white">
                {isSaving ? t("saving") : t("save_follow_up_remark")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FollowUpRow({
  followUp,
  locale,
  last,
}: {
  followUp: PaymentFollowUpPayload;
  locale: string;
  last: boolean;
}) {
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  return (
    <View className="gap-1 px-4 py-3.5" style={last ? undefined : rowSeparatorStyle}>
      <Text selectable className="text-sm text-gray-950 dark:text-gray-50">
        {followUp.remarks}
      </Text>
      <Text selectable className="text-xs text-gray-500 dark:text-gray-400">
        {[
          followUp.createdBy.name ?? followUp.createdBy.username,
          formatDateTime(followUp.createdAt, locale),
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </View>
  );
}
