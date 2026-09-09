import { Image } from "expo-image";
import { ChevronRight, CircleDashed, History } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, View } from "react-native";

import ListFilterIcon from "@/src/components/ui/list-filter-icon";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import {
  applyPaymentHistoryFilters,
  emptyPaymentHistoryFilters,
  isPreviousPaymentNumber,
  paymentHistoryFilterCount,
  type HouseholdPaymentTransaction,
  type PaymentFollowUpPayload,
  type PaymentHistoryFilters,
} from "@/src/features/payments/household-payment-history";
import { getDateLocale, translateStatus } from "@/src/i18n/helpers";

import PaymentHistoryFilterSheet from "./payment-history-filter-sheet";

type Props = {
  payments: HouseholdPaymentTransaction[];
  followUps: PaymentFollowUpPayload[];
  activePaymentPhoneNumber?: string | null;
  isPlaceholder: boolean;
  onOpenTransaction: (payment: HouseholdPaymentTransaction) => void;
};

const PROVIDER_IMAGES: Record<string, number> = {
  "m-pesa": require("@/assets/mno/m-pesa.png"),
  mixx: require("@/assets/mno/mixx.png"),
  "airtel money": require("@/assets/mno/airtel-money.png"),
  halopesa: require("@/assets/mno/halopesa.png"),
  "t-pesa": require("@/assets/mno/t-pesa.png"),
  crdb: require("@/assets/banks/crdb.png"),
  nmb: require("@/assets/banks/nmb.png"),
  nbc: require("@/assets/banks/nbc.png"),
  dtb: require("@/assets/banks/dtb.png"),
  equity: require("@/assets/banks/equity.png"),
  pbz: require("@/assets/banks/pbz.png"),
};

const PROVIDER_ALIASES: [string[], keyof typeof PROVIDER_IMAGES][] = [
  [["mpesa", "vodacom"], "m-pesa"],
  [["tigo pesa", "yas"], "mixx"],
  [["airtel"], "airtel money"],
  [["halo pesa", "halotel"], "halopesa"],
  [["tpesa", "ttcl"], "t-pesa"],
];

const SHORT_MONTHS: Record<string, string> = {
  january: "Jan",
  february: "Feb",
  march: "Mar",
  april: "Apr",
  may: "May",
  june: "Jun",
  july: "Jul",
  august: "Aug",
  september: "Sep",
  october: "Oct",
  november: "Nov",
  december: "Dec",
};

function formatCurrencyAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/[\u00a0\u202f]/g, " ");
}

function getProviderImage(provider: string | null | undefined) {
  const normalized = provider?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (PROVIDER_IMAGES[normalized]) return PROVIDER_IMAGES[normalized];

  const alias = PROVIDER_ALIASES.find(([markers]) =>
    markers.some((marker) => normalized.includes(marker)),
  );
  return alias ? PROVIDER_IMAGES[alias[1]] : null;
}

function formatShortPaymentCycle(payment: HouseholdPaymentTransaction, locale: string) {
  if (payment.paymentWindowStart && payment.paymentWindowEnd) {
    const start = new Date(`${payment.paymentWindowStart.slice(0, 10)}T00:00:00`);
    const end = new Date(`${payment.paymentWindowEnd.slice(0, 10)}T00:00:00`);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const formatter = new Intl.DateTimeFormat(locale, { month: "short" });
      return `${formatter.format(start)} - ${formatter.format(end)}`;
    }
  }

  const paymentWindow = payment.paymentWindow?.trim();
  if (!paymentWindow) return "—";

  return Object.entries(SHORT_MONTHS)
    .reduce(
      (label, [month, shortMonth]) => label.replace(new RegExp(`\\b${month}\\b`, "gi"), shortMonth),
      paymentWindow,
    )
    .replace(/\s+\d{4}\b/g, "")
    .trim();
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const hasTime = value.includes("T");
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function statusColors(status: string | null | undefined, dark: boolean) {
  const normalized = status?.toLowerCase() ?? "";

  if (["received", "accepted", "reconciled", "successful", "success"].includes(normalized)) {
    return {
      backgroundColor: dark ? "#052e16" : "#dcfce7",
      color: dark ? "#86efac" : "#166534",
    };
  }
  if (["failed", "rejected", "duplicate"].includes(normalized)) {
    return {
      backgroundColor: dark ? "#450a0a" : "#fee2e2",
      color: dark ? "#fca5a5" : "#991b1b",
    };
  }

  return {
    backgroundColor: dark ? "#422006" : "#fef3c7",
    color: dark ? "#fde68a" : "#92400e",
  };
}

function uniqueOptions(
  payments: HouseholdPaymentTransaction[],
  key: keyof HouseholdPaymentTransaction,
) {
  return Array.from(
    new Set(
      payments
        .map((payment) => payment[key])
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ).sort((first, second) => first.localeCompare(second));
}

export default function HouseholdPaymentHistorySection({
  payments,
  followUps,
  activePaymentPhoneNumber,
  isPlaceholder,
  onOpenTransaction,
}: Props) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<PaymentHistoryFilters>(emptyPaymentHistoryFilters);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const filteredPayments = useMemo(
    () => applyPaymentHistoryFilters(payments, filters),
    [filters, payments],
  );
  const filterCount = paymentHistoryFilterCount(filters);
  const listSeparatorStyle = useRowSeparatorStyle("top");
  const totalAmountPaid = filteredPayments.reduce(
    (total, payment) => total + (payment.amount ?? 0),
    0,
  );
  const options = useMemo(
    () => ({
      statuses: uniqueOptions(payments, "status"),
      paymentCycles: uniqueOptions(payments, "paymentWindow"),
      providers: uniqueOptions(payments, "provider"),
    }),
    [payments],
  );
  const followUpsByTransaction = useMemo(() => {
    const grouped = new Map<string, PaymentFollowUpPayload[]>();
    for (const followUp of followUps) {
      const current = grouped.get(followUp.transactionUuid) ?? [];
      current.push(followUp);
      grouped.set(followUp.transactionUuid, current);
    }
    for (const items of grouped.values()) {
      items.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    }
    return grouped;
  }, [followUps]);

  return (
    <View className="-mb-4 gap-5 pt-4">
      {isPlaceholder ? (
        <View className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
          <Text selectable className="text-xs leading-5 text-amber-800 dark:text-amber-200">
            {t("placeholder_payment_history_notice")}
          </Text>
        </View>
      ) : null}

      <View className="gap-1 pt-2 pb-2">
        <Text selectable className="text-[10px] text-gray-500 dark:text-gray-400">
          {t("total_amount_paid")}
        </Text>
        <Text selectable className="text-3xl font-semibold text-gray-950 dark:text-gray-50">
          <Text className="font-normal text-gray-500 dark:text-gray-400">TZS </Text>
          {formatCurrencyAmount(totalAmountPaid)}
        </Text>
        <Text selectable className="text-sm text-gray-950 dark:text-gray-50">
          {t("payment_count", { count: filteredPayments.length })}
        </Text>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
            {t("payment_transactions")}
          </Text>
          <Pressable
            onPress={() => setFiltersVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t("filter_payment_history")}
            className="flex-row items-center gap-2 rounded-full bg-gray-100 px-3 py-2 active:opacity-70 dark:bg-gray-800"
          >
            <ListFilterIcon size={15} color={filterCount ? "#047857" : "#6b7280"} />
            <Text
              className={
                filterCount
                  ? "text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  : "text-xs font-semibold text-gray-600 dark:text-gray-300"
              }
            >
              {t("filters")}
              {filterCount ? ` (${filterCount})` : ""}
            </Text>
          </Pressable>
        </View>

        {filteredPayments.length ? (
          <View style={[{ marginHorizontal: -16 }, listSeparatorStyle]}>
            {filteredPayments.map((payment, index) => {
              const transactionId = payment.uuid ?? payment.id ?? String(index);
              const transactionFollowUps = followUpsByTransaction.get(transactionId) ?? [];
              return (
                <PaymentTransactionRow
                  key={transactionId}
                  payment={payment}
                  latestFollowUp={transactionFollowUps[0] ?? null}
                  activePaymentPhoneNumber={activePaymentPhoneNumber}
                  last={index === filteredPayments.length - 1}
                  onPress={() => onOpenTransaction(payment)}
                />
              );
            })}
          </View>
        ) : (
          <View className="items-center gap-3 py-10">
            <History size={28} color="#9ca3af" />
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
              {payments.length
                ? t("no_payment_transactions_match_filters")
                : t("no_payment_history_recorded")}
            </Text>
            {filterCount ? (
              <Pressable onPress={() => setFilters(emptyPaymentHistoryFilters)}>
                <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {t("clear_filters")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <PaymentHistoryFilterSheet
        visible={filtersVisible}
        filters={filters}
        options={options}
        onApply={setFilters}
        onClose={() => setFiltersVisible(false)}
      />
    </View>
  );
}

function PaymentTransactionRow({
  payment,
  latestFollowUp,
  activePaymentPhoneNumber,
  last,
  onPress,
}: {
  payment: HouseholdPaymentTransaction;
  latestFollowUp: PaymentFollowUpPayload | null;
  activePaymentPhoneNumber?: string | null;
  last: boolean;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");
  const colors = statusColors(payment.status, isDark);
  const previousNumber = isPreviousPaymentNumber(
    payment.paymentPhoneNumber,
    activePaymentPhoneNumber,
  );
  const providerImage = getProviderImage(payment.provider);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("open_transaction_reference", {
        reference: payment.transactionReference ?? t("unknown"),
      })}
      className="gap-4 px-4 py-4 active:bg-gray-100 dark:active:bg-gray-900"
      style={last ? undefined : rowSeparatorStyle}
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text
          selectable
          numberOfLines={1}
          className="min-w-0 flex-1 text-base font-semibold text-gray-950 dark:text-gray-50"
        >
          {payment.transactionReference ?? "—"}
        </Text>
        <View className="flex-row items-center gap-2">
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: colors.backgroundColor }}
          >
            <Text selectable className="text-xs font-semibold" style={{ color: colors.color }}>
              {translateStatus(t, payment.status)}
            </Text>
          </View>
          <ChevronRight size={18} color={isDark ? "#6b7280" : "#9ca3af"} />
        </View>
      </View>

      <View className="flex-row items-end justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text selectable className="text-sm font-medium text-gray-950 dark:text-gray-50">
            {formatShortPaymentCycle(payment, getDateLocale(i18n.language))}
          </Text>
          <Text selectable className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatDateTime(payment.paidAt, getDateLocale(i18n.language))}
          </Text>
        </View>
        <Text
          selectable
          className="text-base font-semibold text-gray-950 dark:text-gray-50"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          TZS {formatCurrencyAmount(payment.amount ?? 0)}
        </Text>
      </View>

      <View className="gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            {providerImage ? (
              <Image
                source={providerImage}
                accessibilityLabel={payment.provider ?? t("payment_provider")}
                contentFit="contain"
                style={{ width: 24, height: 24, borderRadius: 6 }}
              />
            ) : (
              <View className="size-6 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                <Text className="text-[9px] font-bold text-gray-600 dark:text-gray-300">
                  {payment.provider?.slice(0, 2).toUpperCase() ?? "—"}
                </Text>
              </View>
            )}
            <View className="min-w-0 flex-1">
              {previousNumber ? (
                <Text className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  {t("previous_payment_number")}
                </Text>
              ) : null}
              <Text
                selectable
                numberOfLines={1}
                className="text-xs text-gray-600 dark:text-gray-300"
              >
                {payment.paymentPhoneNumber ?? "—"}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1.5">
            {!latestFollowUp ? (
              <CircleDashed size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
            ) : null}
            <Text
              selectable
              className="text-right text-xs font-medium text-gray-700 dark:text-gray-200"
            >
              {latestFollowUp
                ? translateStatus(t, latestFollowUp.status)
                : t("follow_up_not_started")}
            </Text>
          </View>
        </View>

        {latestFollowUp ? (
          <Text selectable numberOfLines={2} className="text-xs text-gray-500 dark:text-gray-400">
            {latestFollowUp.remarks}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
