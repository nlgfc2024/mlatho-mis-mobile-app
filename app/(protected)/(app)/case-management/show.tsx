import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { eq, isNull, useLiveQuery } from "@tanstack/react-db";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { parsePhoneNumber } from "libphonenumber-js";
import {
  ChevronRight,
  CreditCard,
  History,
  House,
  Landmark,
  UserLock,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import HouseholdPaymentHistorySection from "@/src/components/case-management/household-payment-history-section";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { getPlaceholderHouseholdPaymentHistory } from "@/src/data/household-payment-history";
import {
  parsePaymentFollowUpPayload,
  type HouseholdPaymentTransaction,
} from "@/src/features/payments/household-payment-history";
import { translateDeactivationReason, translateStatus } from "@/src/i18n/helpers";
import { goBackOrReplace } from "@/src/lib/navigation";
import { shouldShowPaymentPhoneUpdateLink } from "@/src/lib/payment-phone-update";
import {
  householdChangeRequestsCollection,
  householdMembersCollection,
  householdPaymentHistoryCollection,
  householdsCollection,
  paymentAccountsCollection,
} from "@/src/powersync/collections";
import {
  formatHouseholdMemberRowSummary,
  getHouseholdMemberInitials,
  getHouseholdMemberRoleLabel,
} from "@/src/utils/household-member";
import { getHouseholdRepresentativeDisplayName } from "@/src/utils/household-representative";

const PROVIDER_COLORS: Record<string, string> = {
  "m-pesa": "#BD0808",
  mixx: "#00377D",
  "airtel money": "#E40001",
  halopesa: "#F47920",
  "t-pesa": "#FECF0B",
  crdb: "#48B048",
  nmb: "#1F5AA6",
  nbc: "#003A8F",
  dtb: "#E5003A",
  equity: "#B00020",
  pbz: "#0072BC",
};

const PROVIDER_IMAGES: Record<string, any> = {
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

const MNO_PROVIDERS = new Set(["m-pesa", "mixx", "airtel money", "halopesa", "t-pesa"]);

type DetailTab = {
  labelKey: string;
  Icon: LucideIcon;
};

const DETAIL_TABS: DetailTab[] = [
  { labelKey: "household", Icon: House },
  { labelKey: "members", Icon: Users },
  { labelKey: "payment", Icon: CreditCard },
  { labelKey: "payment_history", Icon: History },
];

const TAB_ACTIVE_MAX_WIDTH = 120;
const TAB_ACTIVE_MIN_WIDTH = 96;
const TAB_HORIZONTAL_PADDING = 16;
const TAB_ITEM_GAP = 8;

type PaymentAccountDisplay = {
  uuid?: string | null;
  accountProvider?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  isActive?: boolean | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  synchronizedAt?: string | null;
};

function formatMobileNumber(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  try {
    const phone = parsePhoneNumber(value, "TZ");
    return phone.isValid() ? phone.formatNational() : value;
  } catch {
    return value;
  }
}

function getProviderType(provider: string | null | undefined): "MNO" | "BANK" {
  return provider && MNO_PROVIDERS.has(provider.toLowerCase()) ? "MNO" : "BANK";
}

function formatAccountNumber(account: PaymentAccountDisplay | null, providerType: "MNO" | "BANK") {
  if (!account?.accountNumber) return null;
  return providerType === "MNO" ? formatMobileNumber(account.accountNumber) : account.accountNumber;
}

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
        {value ?? "—"}
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
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeTabWidths, setActiveTabWidths] = useState<Record<string, number>>({});
  const hasPositionedIndicator = useRef(false);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const selectedTab = tabs[selectedIndex];
  const activeTabWidth = selectedTab
    ? (activeTabWidths[selectedTab.labelKey] ?? TAB_ACTIVE_MAX_WIDTH)
    : TAB_ACTIVE_MAX_WIDTH;
  const inactiveTabWidth =
    viewportWidth > 0 && tabs.length > 1
      ? Math.max(
          0,
          (viewportWidth -
            TAB_HORIZONTAL_PADDING * 2 -
            TAB_ITEM_GAP * (tabs.length - 1) -
            activeTabWidth) /
            (tabs.length - 1),
        )
      : null;
  const indicatorTargetX =
    TAB_HORIZONTAL_PADDING +
    (inactiveTabWidth === null
      ? 0
      : (inactiveTabWidth + TAB_ITEM_GAP) * Math.max(0, selectedIndex));

  useEffect(() => {
    if (!viewportWidth) return;

    if (!hasPositionedIndicator.current) {
      indicatorX.value = indicatorTargetX;
      indicatorWidth.value = activeTabWidth;
      indicatorOpacity.value = 1;
      hasPositionedIndicator.current = true;
    } else {
      indicatorX.value = withSpring(indicatorTargetX, {
        damping: 22,
        stiffness: 280,
        mass: 0.8,
        reduceMotion: ReduceMotion.System,
      });
      indicatorWidth.value = withTiming(activeTabWidth, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [
    activeTabWidth,
    indicatorOpacity,
    indicatorTargetX,
    indicatorWidth,
    indicatorX,
    viewportWidth,
  ]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
    >
      <View className="relative flex-row gap-2 px-4">
        <Animated.View
          pointerEvents="none"
          className="absolute top-2 left-0 h-10 rounded-full bg-gray-100 dark:bg-gray-800"
          style={indicatorStyle}
        />
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute top-0 left-0 opacity-0"
        >
          {tabs.map(({ labelKey, Icon }) => {
            const label = t(labelKey);

            return (
              <View
                key={`measure-${labelKey}`}
                collapsable={false}
                className="flex-row items-center justify-center gap-2 self-start"
                style={{
                  maxWidth: TAB_ACTIVE_MAX_WIDTH,
                  minWidth: TAB_ACTIVE_MIN_WIDTH,
                  padding: 10,
                  paddingRight: 14,
                }}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  setActiveTabWidths((currentWidths) =>
                    Math.abs((currentWidths[labelKey] ?? 0) - width) < 0.5
                      ? currentWidths
                      : { ...currentWidths, [labelKey]: width },
                  );
                }}
              >
                <Icon size={20} strokeWidth={2.2} color="#000000" />
                <Text numberOfLines={1} className="shrink text-sm font-medium">
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
        {tabs.map(({ labelKey, Icon }, index) => {
          const isSelected = selectedIndex === index;
          const label = t(labelKey);

          return (
            <Animated.View
              key={labelKey}
              layout={LinearTransition.duration(220)
                .easing(Easing.inOut(Easing.cubic))
                .reduceMotion(ReduceMotion.System)}
              className="h-14 items-center justify-center"
              style={
                isSelected
                  ? { flexShrink: 0, width: activeTabWidth }
                  : inactiveTabWidth === null
                    ? { flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0 }
                    : { width: inactiveTabWidth }
              }
            >
              <Pressable
                onPress={() => {
                  if (isSelected) return;
                  if (process.env.EXPO_OS === "ios") {
                    void Haptics.selectionAsync();
                  }
                  onSelect(index);
                }}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: isSelected }}
                hitSlop={8}
                className={
                  isSelected
                    ? "items-center justify-center"
                    : "h-14 items-center justify-center self-stretch"
                }
                style={
                  isSelected
                    ? {
                        maxWidth: TAB_ACTIVE_MAX_WIDTH,
                        minWidth: TAB_ACTIVE_MIN_WIDTH,
                        padding: 10,
                        paddingRight: 14,
                      }
                    : undefined
                }
              >
                <Animated.View
                  layout={LinearTransition.duration(220)
                    .easing(Easing.out(Easing.cubic))
                    .reduceMotion(ReduceMotion.System)}
                  className={
                    isSelected
                      ? "flex-row items-center justify-center gap-2"
                      : "h-full items-center justify-center self-stretch"
                  }
                >
                  <Animated.View
                    layout={LinearTransition.duration(220)
                      .easing(Easing.out(Easing.cubic))
                      .reduceMotion(ReduceMotion.System)}
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
                  </Animated.View>
                  {isSelected && (
                    <Animated.Text
                      entering={FadeInRight.duration(180)
                        .delay(55)
                        .easing(Easing.out(Easing.cubic))
                        .reduceMotion(ReduceMotion.System)}
                      exiting={FadeOutLeft.duration(100)
                        .easing(Easing.in(Easing.cubic))
                        .reduceMotion(ReduceMotion.System)}
                      numberOfLines={1}
                      className="shrink text-sm font-medium text-gray-900 dark:text-gray-100"
                    >
                      {label}
                    </Animated.Text>
                  )}
                </Animated.View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
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

function PaymentOverview({ account }: { account: PaymentAccountDisplay | null }) {
  const { t } = useTranslation();

  if (!account) {
    return <EmptyState message={t("no_payment_account_recorded")} />;
  }

  const providerType = getProviderType(account.accountProvider);

  return (
    <View>
      <DetailRow label={t("provider_type")} value={providerType} />
      <DetailRow label={t("provider")} value={account.accountProvider} />
      <DetailRow
        label={providerType === "MNO" ? t("mobile_number") : t("account_number")}
        value={formatAccountNumber(account, providerType)}
      />
      <DetailRow
        label={providerType === "MNO" ? t("registered_name") : t("account_name")}
        value={account.accountName}
      />
      <View className="flex-row items-center justify-between py-4">
        <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">{t("status")}</Text>
        <View className="flex-row items-center gap-1.5">
          <View
            className="size-2 rounded-full"
            style={{ backgroundColor: account.isActive ? "#16a34a" : "#9ca3af" }}
          />
          <Text
            className="text-sm font-medium"
            style={{ color: account.isActive ? "#16a34a" : "#9ca3af" }}
          >
            {account.isActive ? t("active") : t("inactive")}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HouseholdShow() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { household, id, uuid } = useLocalSearchParams<{
    id: string;
    uuid: string;
    household: string;
  }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const memberSeparatorStyle = useRowSeparatorStyle("bottom");

  const routeItem = useMemo(() => {
    try {
      return household ? JSON.parse(household) : null;
    } catch {
      return null;
    }
  }, [household]);
  const householdUuid = uuid ?? routeItem?.uuid ?? "";

  const { data: householdRows } = useLiveQuery(
    (q) =>
      q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.uuid, householdUuid))
        .orderBy(({ household }) => household.id, "asc")
        .limit(1),
    [householdUuid],
  );

  const { data: members = [] } = useLiveQuery(
    (q) =>
      q
        .from({ member: householdMembersCollection })
        .where(({ member }) => eq(member.householdUuid, householdUuid))
        .where(({ member }) => isNull(member.deletedAt))
        .orderBy(({ member }) => member.isActive, "desc")
        .orderBy(({ member }) => member.fullName, "asc"),
    [householdUuid],
  );

  const { data: paymentAccounts = [] } = useLiveQuery(
    (q) =>
      q
        .from({ account: paymentAccountsCollection })
        .where(({ account }) => eq(account.houseHoldId, householdUuid))
        .where(({ account }) => isNull(account.deletedAt))
        .orderBy(({ account }) => account.isActive, "desc")
        .orderBy(({ account }) => account.updatedAt, "desc")
        .orderBy(({ account }) => account.createdAt, "desc"),
    [householdUuid],
  );

  const { data: paymentHistory = [] } = useLiveQuery(
    (q) =>
      q
        .from({ payment: householdPaymentHistoryCollection })
        .where(({ payment }) => eq(payment.householdUuid, householdUuid))
        .where(({ payment }) => isNull(payment.deletedAt))
        .orderBy(({ payment }) => payment.paidAt, "desc")
        .orderBy(({ payment }) => payment.createdAt, "desc"),
    [householdUuid],
  );

  const { data: paymentFollowUpRows = [] } = useLiveQuery(
    (q) =>
      q
        .from({ request: householdChangeRequestsCollection })
        .where(({ request }) => eq(request.householdUuid, householdUuid))
        .where(({ request }) => eq(request.type, "payment_follow_up_added"))
        .where(({ request }) => isNull(request.deletedAt))
        .orderBy(({ request }) => request.createdAt, "desc"),
    [householdUuid],
  );
  const paymentFollowUps = useMemo(
    () =>
      paymentFollowUpRows
        .map((row) => parsePaymentFollowUpPayload(row.payload))
        .filter((row) => row !== null),
    [paymentFollowUpRows],
  );

  const householdRow = householdRows?.[0];
  const item = householdRow
    ? {
        ...routeItem,
        id: householdRow.id,
        reference: householdRow.reference,
        uuid: householdRow.uuid,
        headName: householdRow.headName,
        representativeName: householdRow.representativeName,
        groupCode: householdRow.groupCode,
        address: householdRow.address,
        status: householdRow.caseStatus,
        deactivationReason: householdRow.deactivationReason,
        deactivatedAt: householdRow.deactivatedAt,
        villageId: householdRow.villageId,
      }
    : routeItem;

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

  const currentPaymentAccount =
    paymentAccounts.find((account) => account.isActive) ??
    (item.accountProvider
      ? {
          uuid: item.accountUuid,
          accountProvider: item.accountProvider,
          accountNumber: item.accountNumber,
          accountName: item.accountName,
          isActive: item.isActive,
        }
      : null);
  const provider = currentPaymentAccount?.accountProvider?.toLowerCase();
  const imageSource = provider ? PROVIDER_IMAGES[provider] : null;
  const brandColor = (provider ? PROVIDER_COLORS[provider] : null) ?? "#0d542b";
  const heroGradientColors: [string, string, string] = isDark
    ? [`${brandColor}38`, `${brandColor}14`, "#030712"]
    : [`${brandColor}30`, `${brandColor}08`, "#ffffff"];
  const paymentActionLabel = currentPaymentAccount
    ? t("edit_payment_record")
    : t("create_payment_record");
  const representativeName = getHouseholdRepresentativeDisplayName(item);
  const isPlaceholderPaymentHistory = paymentHistory.length === 0;
  const displayedPaymentHistory = isPlaceholderPaymentHistory
    ? getPlaceholderHouseholdPaymentHistory(householdUuid)
    : paymentHistory;

  const handleShowMember = (member: (typeof members)[number]) => {
    router.push({
      pathname: "/(protected)/(app)/case-management/members/[id]",
      params: {
        id: member.uuid ?? member.id,
        householdId: id,
        uuid: householdUuid,
        household,
        member: JSON.stringify(member),
      },
    });
  };

  const handleManagePayment = () => {
    router.push({
      pathname: "/(protected)/(app)/case-management/payments/[id]/edit",
      params: {
        id: String(item.id ?? id ?? ""),
        uuid: householdUuid,
        household: JSON.stringify({
          ...item,
          accountUuid: currentPaymentAccount?.uuid ?? null,
          accountProvider: currentPaymentAccount?.accountProvider ?? null,
          accountNumber: currentPaymentAccount?.accountNumber ?? null,
          accountName: currentPaymentAccount?.accountName ?? null,
          isActive: currentPaymentAccount?.isActive ?? false,
        }),
      },
    });
  };

  const handleUpdatePaymentPhone = () => {
    router.push({
      pathname: "/(protected)/(app)/case-management/payments/[id]/phone-update",
      params: {
        id: String(item.id ?? id ?? ""),
        uuid: householdUuid,
        household: JSON.stringify({
          ...item,
          accountUuid: currentPaymentAccount?.uuid ?? null,
          accountProvider: currentPaymentAccount?.accountProvider ?? null,
          accountNumber: currentPaymentAccount?.accountNumber ?? null,
          accountName: currentPaymentAccount?.accountName ?? null,
          isActive: currentPaymentAccount?.isActive ?? false,
        }),
      },
    });
  };

  const handleOpenPaymentTransaction = (payment: HouseholdPaymentTransaction) => {
    router.push({
      pathname: "/(protected)/(app)/case-management/payments/history/[id]",
      params: {
        id: String(payment.uuid ?? payment.id ?? ""),
        uuid: householdUuid,
        payment: JSON.stringify(payment),
        activePaymentPhoneNumber: currentPaymentAccount?.accountNumber ?? "",
      },
    });
  };

  return (
    <>
      <SafeAreaView
        edges={["bottom"]}
        style={{ backgroundColor: isDark ? "#030712" : "#ffffff", flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Hero */}
          <LinearGradient
            colors={heroGradientColors}
            locations={[0, 0.6, 1]}
            className="items-start gap-3 p-4"
          >
            <View className="size-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800">
              {imageSource ? (
                <Image source={imageSource} className="size-full" />
              ) : (
                <Landmark size={32} color={isDark ? "#9ca3af" : "#6b7280"} />
              )}
            </View>
            <View className="items-start gap-1">
              <Text className="text-xs font-normal text-gray-600 dark:text-gray-400">
                {item.groupCode}
              </Text>
              <Text className="text-2xl font-bold text-gray-950 dark:text-gray-50">
                {item.headName}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <UserLock size={14} color={isDark ? "#e5e7eb" : "#030712"} />
                <Text className="text-sm text-gray-950 dark:text-gray-50">
                  {representativeName ?? "—"}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View className="pt-2">
            <DetailTabs tabs={DETAIL_TABS} selectedIndex={activeTab} onSelect={setActiveTab} />

            <Animated.View
              key={activeTab}
              entering={FadeIn.duration(180)
                .easing(Easing.out(Easing.cubic))
                .reduceMotion(ReduceMotion.System)}
              className="px-4 pb-4"
            >
              <Text className="py-4 text-sm font-semibold text-gray-950 dark:text-gray-50">
                {t(DETAIL_TABS[activeTab]?.labelKey ?? "")}
              </Text>

              {activeTab === 0 && (
                <View className="-mb-4">
                  <DetailRow label={t("household_code")} value={item.groupCode} />
                  <DetailRow label={t("household_head_name")} value={item.headName} />
                  <DetailRow label={t("household_representative")} value={representativeName} />
                  <DetailRow label={t("address")} value={item.address} />
                  <DetailRow
                    label={t("status")}
                    value={translateStatus(t, item.status === "inactive" ? "inactive" : "active")}
                  />
                  {item.status === "inactive" ? (
                    <>
                      <DetailRow label={t("deactivated_at")} value={item.deactivatedAt} />
                      <DetailRow
                        label={t("reason")}
                        value={
                          item.deactivationReason
                            ? translateDeactivationReason(t, item.deactivationReason)
                            : item.deactivationReason
                        }
                        last
                      />
                    </>
                  ) : (
                    <DetailRow label={t("members")} value={`${members.length}`} last />
                  )}
                </View>
              )}

              {activeTab === 1 && (
                <View>
                  {members.length ? (
                    members.map((member, index) => (
                      <Pressable
                        onPress={() => handleShowMember(member)}
                        accessibilityRole="button"
                        accessibilityLabel={t("view_member_details", {
                          name: member.fullName ?? t("member"),
                        })}
                        key={member.uuid ?? member.id}
                        className="flex-row items-center gap-3 py-4 focus:bg-pressed active:bg-pressed"
                        style={index === members.length - 1 ? undefined : memberSeparatorStyle}
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
                                  member.isHead || member.isRepresentative
                                    ? "size-1.5 rounded-full bg-emerald-600"
                                    : "size-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                                }
                              />
                              <Text
                                className={
                                  member.isHead || member.isRepresentative
                                    ? "text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                                    : "text-[10px] font-semibold text-gray-700 dark:text-gray-300"
                                }
                              >
                                {getHouseholdMemberRoleLabel(member, t)}
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
                              {t("reason")}:{" "}
                              {translateDeactivationReason(t, member.deactivationReason)}
                            </Text>
                          )}
                        </View>

                        <ChevronRight size={18} color={isDark ? "#6b7280" : "#9ca3af"} />
                      </Pressable>
                    ))
                  ) : (
                    <View className="py-10">
                      <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                        {t("no_household_members_recorded")}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 2 && <PaymentOverview account={currentPaymentAccount} />}

              {activeTab === 3 && (
                <HouseholdPaymentHistorySection
                  payments={displayedPaymentHistory}
                  followUps={paymentFollowUps}
                  activePaymentPhoneNumber={currentPaymentAccount?.accountNumber}
                  isPlaceholder={isPlaceholderPaymentHistory}
                  onOpenTransaction={handleOpenPaymentTransaction}
                />
              )}
            </Animated.View>
          </View>
        </ScrollView>

        {activeTab === 2 && (
          <View className="gap-3 bg-white px-4 pt-4 dark:bg-gray-950">
            {shouldShowPaymentPhoneUpdateLink(Boolean(item.needsPaymentDataUpdate)) && (
              <Host style={{ width: "100%", height: 44 }}>
                <Button
                  modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                  onClick={handleUpdatePaymentPhone}
                  colors={{ containerColor: "#f3f4f6", contentColor: "#111827" }}
                >
                  <JCText>{t("update_payment_phone_number")}</JCText>
                </Button>
              </Host>
            )}
            <Host style={{ width: "100%", height: 44 }}>
              <Button
                modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                onClick={handleManagePayment}
                colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
              >
                <JCText>{paymentActionLabel}</JCText>
              </Button>
            </Host>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
