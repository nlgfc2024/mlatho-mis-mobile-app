import { Host, ModalBottomSheet, ModalBottomSheetRef, RNHostView } from "@expo/ui/jetpack-compose";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ClipboardPenLine,
  CreditCard,
  Landmark,
  MapPinned,
  Smartphone,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, Text, useColorScheme, useWindowDimensions, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { translateStatus } from "@/src/i18n/helpers";
import { isMobileMoneyAccount } from "@/src/lib/payment-data-update";
import { shouldShowPaymentPhoneUpdateLink } from "@/src/lib/payment-phone-update";

function getAccountType(
  provider: string | null | undefined,
  accountNumber: string | null | undefined,
): "MNO" | "BANK" {
  return isMobileMoneyAccount({ accountProvider: provider, accountNumber }) ? "MNO" : "BANK";
}

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

export type HouseholdItem = {
  id: string;
  reference: string | null;
  uuid: string | null;
  headName: string | null;
  representativeName: string | null;
  groupCode: string | null;
  address: string | null;
  status: "active" | "inactive";
  deactivationReason: string | null;
  deactivatedAt: string | null;
  villageId: string | null;
  memberCount: number;
  isActive: boolean;
  accountUuid: string | null;
  accountName: string;
  accountNumber: string;
  accountProvider: string | null | undefined;
  hasPaymentDetails: boolean;
  needsPaymentDataUpdate: boolean;
};

type Action = {
  icon?: ReactNode;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  item: HouseholdItem;
};

const CaseManagementListItem = ({ item }: Props) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const actionIconColor = isDark ? "#d1d5db" : "#374151";
  const sheetBackground = isDark ? "#101828" : "#ffffff";
  const { width } = useWindowDimensions();
  const rowSeparatorStyle = useRowSeparatorStyle("top");
  const provider = item.accountProvider?.toLowerCase();
  const imageSource = provider ? PROVIDER_IMAGES[provider] : null;
  const accountLabel =
    getAccountType(item.accountProvider, item.accountNumber) === "MNO"
      ? t("mobile_number")
      : t("account_number");
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const sheetRef = useRef<ModalBottomSheetRef>(null);

  const serializedItem = JSON.stringify(item);
  const idParam = item.id;
  const uuidParam = item.uuid ?? "";
  const isHouseholdActive = item.status === "active";

  const viewAction: Action = {
    label: t("view_details"),
    onPress: () => {
      setIsOpen(false);
      router.push({
        pathname: "/(protected)/(app)/case-management/show",
        params: { id: idParam, uuid: uuidParam, household: serializedItem },
      });
    },
  };

  const deactivateAction: Action | null = isHouseholdActive
    ? {
        label: t("deactivate_household"),
        destructive: true,
        onPress: () => {
          setIsOpen(false);
          router.push({
            pathname: "/(protected)/(app)/case-management/deactivate",
            params: { id: idParam, uuid: uuidParam, household: serializedItem },
          });
        },
      }
    : null;

  const tileActions: Action[] = [
    {
      icon: <UsersRound size={20} color={actionIconColor} />,
      label: t("manage_members"),
      onPress: () => {
        setIsOpen(false);
        router.push({
          pathname: "/(protected)/(app)/case-management/members",
          params: { id: idParam, uuid: uuidParam, household: serializedItem },
        });
      },
    },
    ...(isHouseholdActive
      ? [
          {
            icon: <UserPlus size={20} color={actionIconColor} />,
            label: t("add_member"),
            onPress: () => {
              setIsOpen(false);
              router.push({
                pathname: "/(protected)/(app)/case-management/members/create",
                params: { householdId: idParam, uuid: uuidParam, household: serializedItem },
              });
            },
          },
          {
            icon: <ClipboardPenLine size={20} color={actionIconColor} />,
            label: t("update_household"),
            onPress: () => {
              setIsOpen(false);
              router.push({
                pathname: "/(protected)/(app)/case-management/details",
                params: { id: idParam, uuid: uuidParam, household: serializedItem },
              });
            },
          },
          {
            icon: <MapPinned size={20} color={actionIconColor} />,
            label: t("change_address"),
            onPress: () => {
              setIsOpen(false);
              router.push({
                pathname: "/(protected)/(app)/case-management/address/[id]/edit",
                params: { id: idParam, uuid: uuidParam, household: serializedItem },
              });
            },
          },
        ]
      : []),
    {
      icon: <CreditCard size={20} color={actionIconColor} />,
      label: t("update_payment"),
      onPress: () => {
        setIsOpen(false);
        router.push({
          pathname: "/(protected)/(app)/case-management/payments/[id]/edit",
          params: { id: idParam, uuid: uuidParam, household: serializedItem },
        });
      },
    },
    ...(shouldShowPaymentPhoneUpdateLink(item.needsPaymentDataUpdate)
      ? [
          {
            icon: <Smartphone size={20} color={actionIconColor} />,
            label: t("update_payment_phone_number"),
            onPress: () => {
              setIsOpen(false);
              router.push({
                pathname: "/(protected)/(app)/case-management/payments/[id]/phone-update",
                params: {
                  id: idParam,
                  uuid: uuidParam,
                  household: serializedItem,
                },
              });
            },
          },
        ]
      : []),
    {
      icon: <UserRound size={20} color={actionIconColor} />,
      label: t("update_representative"),
      onPress: () => {
        setIsOpen(false);
        router.push({
          pathname: "/(protected)/(app)/case-management/representative/[id]/edit",
          params: { id: idParam, uuid: uuidParam, household: serializedItem },
        });
      },
    },
  ];

  const tileRows: Action[][] = [];
  for (let i = 0; i < tileActions.length; i += 2) {
    tileRows.push(tileActions.slice(i, i + 2));
  }

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={rowSeparatorStyle}
        className="flex flex-row items-stretch gap-3 p-4 focus:bg-pressed active:bg-pressed"
      >
        <View className="aspect-square size-12 items-center justify-center overflow-hidden rounded-xl bg-gray-200/75 dark:bg-gray-800">
          {imageSource ? (
            <Image source={imageSource} className="size-full" resizeMode="contain" />
          ) : (
            <Landmark size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
          )}
        </View>

        <View className="flex-1 gap-1">
          <View>
            <View className="flex-row items-start justify-between gap-2">
              <Text className="min-w-0 flex-1 text-xs font-medium text-green-600 dark:text-green-400">
                {accountLabel} · {item.accountNumber}
              </Text>
              {item.needsPaymentDataUpdate && (
                <View
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={t("payment_data_update_required")}
                >
                  <AlertTriangle size={14} color={isDark ? "#fcd34d" : "#b45309"} />
                </View>
              )}
            </View>
            {item.status === "inactive" && (
              <View className="mt-1 self-start rounded-full bg-red-100 px-2 py-0.5 dark:bg-red-950">
                <Text className="text-[10px] font-semibold text-red-700 dark:text-red-300">
                  {translateStatus(t, "inactive")}
                </Text>
              </View>
            )}
            <Text className="text-base leading-5 font-bold text-gray-950 dark:text-gray-50">
              {item.headName}
            </Text>
          </View>
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
            {item.groupCode} · {t("member_count", { count: item.memberCount })}
          </Text>
        </View>
      </Pressable>

      {isOpen && (
        <Host
          style={{ position: "absolute", width }}
          colorScheme={isDark ? "dark" : "light"}
          seedColor="#0d542b"
        >
          <ModalBottomSheet
            ref={sheetRef}
            containerColor={sheetBackground}
            onDismissRequest={() => setIsOpen(false)}
            skipPartiallyExpanded
          >
            <RNHostView matchContents>
              <View style={{ width }} className="px-4 pb-10">
                <View className="mb-4 border-b border-gray-100 pb-4 dark:border-[#101828]">
                  <Text className="text-lg font-bold text-gray-950 dark:text-gray-50">
                    {item.headName}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {item.groupCode} · {t("member_count", { count: item.memberCount })}
                  </Text>
                  {item.needsPaymentDataUpdate && (
                    <View className="mt-3 flex-row items-start gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/60">
                      <AlertTriangle
                        size={16}
                        color={isDark ? "#fcd34d" : "#b45309"}
                        style={{ marginTop: 1 }}
                      />
                      <Text className="min-w-0 flex-1 text-xs leading-4 font-normal text-amber-800 dark:text-amber-200">
                        {t("failed_mobile_payment_update_hint")}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="gap-3">
                  {tileRows.map((row, rowIndex) => (
                    <View key={rowIndex} className="flex-row gap-3">
                      {row.map((action) => (
                        <Pressable
                          key={action.label}
                          onPress={action.onPress}
                          className={[
                            "min-h-24 flex-1 items-start justify-between gap-3 rounded-xl",
                            "border border-gray-100 bg-gray-50 px-4 py-4 active:bg-pressed-strong focus:bg-pressed-strong",
                            "dark:border-gray-800 dark:bg-gray-800",
                          ].join(" ")}
                        >
                          {action.icon && (
                            <View className="h-10 justify-center rounded-lg">{action.icon}</View>
                          )}
                          <Text className="max-w-full text-left text-sm leading-4 font-semibold text-gray-900 dark:text-gray-100">
                            {action.label}
                          </Text>
                        </Pressable>
                      ))}

                      {row.length < 2 && <View style={{ flex: 1 }} />}
                    </View>
                  ))}
                </View>

                <View className="mt-4 gap-3 border-t border-gray-100 pt-4 dark:border-[#101828]">
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={viewAction.label}
                    onPress={viewAction.onPress}
                    className="h-12 items-center justify-center rounded-full bg-gray-100 px-5 active:opacity-80 dark:bg-gray-800"
                  >
                    <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {viewAction.label}
                    </Text>
                  </Pressable>

                  {deactivateAction && (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={deactivateAction.label}
                      onPress={deactivateAction.onPress}
                      className="h-12 items-center justify-center rounded-full bg-red-100 px-5 active:opacity-80 dark:bg-red-600"
                    >
                      <Text className="text-sm font-semibold text-red-800 dark:text-white">
                        {deactivateAction.label}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </RNHostView>
          </ModalBottomSheet>
        </Host>
      )}
    </>
  );
};

export default CaseManagementListItem;
