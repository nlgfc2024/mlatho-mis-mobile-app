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

import { getRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { useFieldContext } from "@/src/providers/form-context";
import { grievanceStore } from "@/src/store/grievance-store";

function generateYears(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const CURRENT_YEAR = new Date().getFullYear();
// Only the current year and earlier are selectable — upcoming years are not
// allowed. Most recent first.
const YEARS = generateYears(CURRENT_YEAR - 6, CURRENT_YEAR).reverse();

const PaymentWindowYearField = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const field = useFieldContext<string | number | null>();
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);

  const year = useStore(grievanceStore, (state) => state.paymentWindowYear);

  useEffect(() => {
    if (field.state.value !== year) {
      field.setValue(year);
    }
  }, [field, year]);

  const sheetBackground = isDark ? "#101828" : "#ffffff";
  const sheetBottomPadding = Math.max(insets.bottom, 16);
  const checkColor = isDark ? "#f9fafb" : "#030712";
  const rowSeparatorStyle = getRowSeparatorStyle("top", isDark);

  const closeSheet = useCallback(() => {
    const hidePromise = sheetRef.current?.hide();

    if (hidePromise) {
      void hidePromise.catch(() => undefined).finally(() => setVisible(false));
      return;
    }

    setVisible(false);
  }, []);

  const selectYear = (value: number) => {
    grievanceStore.setState((state) => ({ ...state, paymentWindowYear: value }));
    closeSheet();
  };

  return (
    <Host matchContents>
      <RNHostView matchContents>
        <Pressable
          onPress={() => setVisible(true)}
          className="flex flex-none flex-row items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-100 px-4 py-3 dark:border-gray-800 dark:bg-gray-800"
        >
          <Text
            className={`text-sm font-normal ${year ? "text-gray-950 dark:text-gray-50" : "text-gray-500 dark:text-gray-400"}`}
          >
            {year || t("year")}
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
              <View className="flex flex-row items-center justify-between pb-2">
                <Text className="text-base font-bold text-gray-950 dark:text-gray-50">
                  {t("payment_window_year")}
                </Text>
                <Pressable onPress={closeSheet}>
                  <Text className="text-blue-600 dark:text-blue-400">{t("cancel")}</Text>
                </Pressable>
              </View>

              <View className="flex flex-col">
                {YEARS.map((value, index) => (
                  <Pressable
                    key={value}
                    onPress={() => selectYear(value)}
                    className="flex flex-row items-center justify-between py-4 focus:bg-pressed active:bg-pressed"
                    style={index > 0 ? rowSeparatorStyle : undefined}
                  >
                    <Text className="text-sm font-normal text-gray-950 dark:text-gray-50">
                      {value}
                    </Text>

                    {value === year && <Check size={18} color={checkColor} />}
                  </Pressable>
                ))}
              </View>
            </View>
          </RNHostView>
        </ModalBottomSheet>
      )}
    </Host>
  );
};

export default PaymentWindowYearField;
