import {
  Button,
  Host,
  ModalBottomSheet,
  type ModalBottomSheetRef,
  RadioButton,
  RNHostView,
  Text as JCText,
} from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, useWindowDimensions, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import {
  DEFAULT_HOUSEHOLD_LIST_OPTIONS,
  type HouseholdListOptions,
  type HouseholdMemberSort,
  type HouseholdPaymentFilter,
} from "@/src/utils/case-management-household-list";

type HouseholdFilterSheetProps = {
  visible: boolean;
  value: HouseholdListOptions;
  onApply: (value: HouseholdListOptions) => void;
  onClose: () => void;
};

export default function HouseholdFilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: HouseholdFilterSheetProps) {
  if (!visible) return null;

  return <MountedHouseholdFilterSheet value={value} onApply={onApply} onClose={onClose} />;
}

function MountedHouseholdFilterSheet({
  value,
  onApply,
  onClose,
}: Omit<HouseholdFilterSheetProps, "visible">) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { width } = useWindowDimensions();
  const [draftValue, setDraftValue] = useState(value);
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");
  const paymentOptions: { value: HouseholdPaymentFilter; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "with-payment-details", label: t("with_payment_details") },
    { value: "without-payment-details", label: t("without_payment_details") },
    { value: "phone-update-required", label: t("phone_update_required") },
  ];
  const sortOptions: { value: HouseholdMemberSort; label: string; detail?: string }[] = [
    { value: "default", label: t("sort_default") },
    { value: "member-count-asc", label: t("number_of_members"), detail: t("ascending") },
    { value: "member-count-desc", label: t("number_of_members"), detail: t("descending") },
  ];

  const handleApply = () => {
    const finish = () => {
      onApply(draftValue);
      onClose();
    };

    const hidePromise = sheetRef.current?.hide();
    if (hidePromise) {
      hidePromise.then(finish);
    } else {
      finish();
    }
  };

  return (
    <Host
      style={{ position: "absolute", width }}
      colorScheme={isDark ? "dark" : "light"}
      seedColor="#0d542b"
    >
      <ModalBottomSheet
        ref={sheetRef}
        containerColor={isDark ? "#101828" : "#ffffff"}
        contentColor={isDark ? "#f9fafb" : "#111827"}
        onDismissRequest={onClose}
        skipPartiallyExpanded
      >
        <RNHostView matchContents>
          <View style={{ width }} className="px-4 pt-2 pb-8">
            <View className="flex-row items-center justify-between pb-3">
              <Text className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                {t("filter_and_sort_households")}
              </Text>
              <Pressable
                onPress={() => setDraftValue(DEFAULT_HOUSEHOLD_LIST_OPTIONS)}
                accessibilityRole="button"
                accessibilityLabel={t("reset")}
                hitSlop={8}
              >
                <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                  {t("reset")}
                </Text>
              </Pressable>
            </View>

            <Text className="pt-2 pb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {t("payment_details")}
            </Text>

            {paymentOptions.map((option, index) => {
              const isSelected = draftValue.paymentFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    setDraftValue((current) => ({
                      ...current,
                      paymentFilter: option.value,
                    }))
                  }
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: isSelected }}
                  className="flex-row items-center justify-between py-4 focus:bg-pressed active:bg-pressed"
                  style={index === paymentOptions.length - 1 ? undefined : rowSeparatorStyle}
                >
                  <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                    {option.label}
                  </Text>
                  <Host
                    matchContents
                    style={{ width: 24, height: 24 }}
                    colorScheme={isDark ? "dark" : "light"}
                    seedColor="#0d542b"
                  >
                    <RadioButton
                      selected={isSelected}
                      onClick={() =>
                        setDraftValue((current) => ({
                          ...current,
                          paymentFilter: option.value,
                        }))
                      }
                    />
                  </Host>
                </Pressable>
              );
            })}

            <Text className="pt-5 pb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {t("sort_by")}
            </Text>

            {sortOptions.map((option, index) => {
              const isSelected = draftValue.memberSort === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    setDraftValue((current) => ({
                      ...current,
                      memberSort: option.value,
                    }))
                  }
                  accessibilityRole="radio"
                  accessibilityLabel={
                    option.detail ? `${option.label}: ${option.detail}` : option.label
                  }
                  accessibilityState={{ checked: isSelected }}
                  className="flex-row items-center justify-between py-4 focus:bg-pressed active:bg-pressed"
                  style={index === sortOptions.length - 1 ? undefined : rowSeparatorStyle}
                >
                  <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                    {option.label}
                    {option.detail ? (
                      <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
                        : {option.detail}
                      </Text>
                    ) : null}
                  </Text>
                  <Host
                    matchContents
                    style={{ width: 24, height: 24 }}
                    colorScheme={isDark ? "dark" : "light"}
                    seedColor="#0d542b"
                  >
                    <RadioButton
                      selected={isSelected}
                      onClick={() =>
                        setDraftValue((current) => ({
                          ...current,
                          memberSort: option.value,
                        }))
                      }
                    />
                  </Host>
                </Pressable>
              );
            })}

            <Host
              style={{ width: "100%", height: 48, marginTop: 12 }}
              colorScheme={isDark ? "dark" : "light"}
              seedColor="#0d542b"
            >
              <Button
                onClick={handleApply}
                modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
              >
                <JCText>{t("apply_filters")}</JCText>
              </Button>
            </Host>
          </View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
