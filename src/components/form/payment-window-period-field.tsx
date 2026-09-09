import {
  Host,
  ModalBottomSheet,
  RNHostView,
  type ModalBottomSheetRef,
} from "@expo/ui/jetpack-compose";
import { useStore } from "@tanstack/react-store";
import { Check, ChevronDown } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFieldContext } from "@/src/providers/form-context";
import { grievanceStore } from "@/src/store/grievance-store";

const PERIODS = ["Jan - Feb", "Mar - Apr", "May - Jun", "Jul - Aug", "Sep - Oct", "Nov - Dec"];

const CURRENT_YEAR = new Date().getFullYear();
// Index of the period that contains the current month. When the current year is
// selected, any period after this one hasn't started yet ("upcoming").
const CURRENT_PERIOD_INDEX = Math.floor(new Date().getMonth() / 2);

const isUpcomingPeriod = (index: number, year: number | string | null | undefined) =>
  Number(year) === CURRENT_YEAR && index > CURRENT_PERIOD_INDEX;

const PaymentWindowPeriodField = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const field = useFieldContext<string | number | null>();
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);

  const period = useStore(grievanceStore, (state) => state.paymentWindowPeriod ?? "");
  const year = useStore(grievanceStore, (state) => state.paymentWindowYear);
  const disabled = !year;

  useEffect(() => {
    if (field.state.value !== period) {
      field.setValue(period);
    }
  }, [field, period]);

  // Keep the stored period valid: clear it when the year is removed or when a
  // year change turns the selected period into an upcoming one.
  useEffect(() => {
    if (!period) return;
    if (!year || isUpcomingPeriod(PERIODS.indexOf(period), year)) {
      grievanceStore.setState((state) => ({ ...state, paymentWindowPeriod: "" }));
    }
  }, [period, year]);

  const sheetBackground = isDark ? "#101828" : "#ffffff";
  const sheetBottomPadding = Math.max(insets.bottom, 16);

  const closeSheet = useCallback(() => {
    const hidePromise = sheetRef.current?.hide();

    if (hidePromise) {
      void hidePromise.catch(() => undefined).finally(() => setVisible(false));
      return;
    }

    setVisible(false);
  }, []);

  const selectPeriod = (value: string) => {
    grievanceStore.setState((state) => ({ ...state, paymentWindowPeriod: value }));
    closeSheet();
  };

  const rows: string[][] = [];
  for (let i = 0; i < PERIODS.length; i += 2) {
    rows.push(PERIODS.slice(i, i + 2));
  }

  return (
    <Host matchContents={{ vertical: true }} style={{ flex: 1 }}>
      <RNHostView matchContents>
        <Pressable
          disabled={disabled}
          onPress={() => setVisible(true)}
          className={`flex w-full flex-row justify-between gap-3 rounded-xl border border-gray-100 bg-gray-100 px-4 py-3 dark:border-gray-800 dark:bg-gray-800 ${disabled ? "opacity-50" : ""}`}
        >
          <Text
            className={`text-sm font-normal ${period ? "text-gray-950 dark:text-gray-50" : "text-gray-500 dark:text-gray-400"}`}
            numberOfLines={1}
          >
            {period || (disabled ? t("select_year_first") : t("select_payment_window"))}
          </Text>
          <ChevronDown size={18} strokeWidth={2} color={isDark ? "#9ca3af" : "#6B7280"} />
        </Pressable>
      </RNHostView>

      {visible && (
        <ModalBottomSheet
          ref={sheetRef}
          containerColor={sheetBackground}
          onDismissRequest={() => setVisible(false)}
          skipPartiallyExpanded
        >
          <RNHostView matchContents>
            <View className="px-4 pt-2" style={{ width, paddingBottom: sheetBottomPadding }}>
              <View className="flex flex-row items-center justify-between pb-4">
                <Text className="text-base font-bold text-gray-950 dark:text-gray-50">
                  {t("payment_window_period")}
                </Text>
                <Pressable onPress={closeSheet}>
                  <Text className="text-blue-600 dark:text-blue-400">{t("cancel")}</Text>
                </Pressable>
              </View>

              <View className="gap-3">
                {rows.map((row, index) => (
                  <View key={index} className="flex flex-row justify-between gap-3">
                    {row.map((item) => {
                      const isSelected = period === item;
                      const itemDisabled = isUpcomingPeriod(PERIODS.indexOf(item), year);
                      return (
                        <Pressable
                          key={item}
                          disabled={itemDisabled}
                          onPress={() => selectPeriod(item)}
                          className={`relative h-24 flex-1 items-center justify-center overflow-hidden rounded-2xl border ${
                            isSelected
                              ? "border-green-100 bg-green-100 dark:border-green-950 dark:bg-green-950"
                              : "border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
                          } ${itemDisabled ? "opacity-40" : ""}`}
                        >
                          <Text
                            className={`text-sm font-normal ${
                              isSelected
                                ? "text-green-900 dark:text-green-300"
                                : "text-gray-950 dark:text-gray-50"
                            }`}
                          >
                            {item}
                          </Text>

                          {isSelected && (
                            <View className="absolute top-3 right-3">
                              <View className="rounded-full bg-green-700 p-1">
                                <Check size={14} strokeWidth={2.5} color={"#ffffff"} />
                              </View>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </RNHostView>
        </ModalBottomSheet>
      )}
    </Host>
  );
};

export default PaymentWindowPeriodField;
