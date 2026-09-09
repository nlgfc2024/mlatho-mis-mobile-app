import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { CalendarDays, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  emptyPaymentHistoryFilters,
  type PaymentHistoryFilters,
} from "@/src/features/payments/household-payment-history";

type FilterOptions = {
  statuses: string[];
  paymentCycles: string[];
  providers: string[];
};

type Props = {
  visible: boolean;
  filters: PaymentHistoryFilters;
  options: FilterOptions;
  onApply: (filters: PaymentHistoryFilters) => void;
  onClose: () => void;
};

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full px-3 py-2 ${active ? "bg-green-900" : "bg-gray-100"}`}
    >
      <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-700"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-gray-950">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label={t("all")} active={selected === null} onPress={() => onSelect(null)} />
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            active={selected === option}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </View>
  );
}

export default function PaymentHistoryFilterSheet(props: Props) {
  if (!props.visible) return null;
  return <MountedSheet {...props} />;
}

function MountedSheet({ filters, options, onApply, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [draft, setDraft] = useState(filters);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);

  const set = <K extends keyof PaymentHistoryFilters>(key: K, value: PaymentHistoryFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <>
      <Host matchContents>
        <ModalBottomSheet containerColor="#ffffff" onDismissRequest={onClose}>
          <RNHostView matchContents>
            <View
              style={{
                width: Math.min(width, 640),
                height: height * 0.82,
                paddingBottom: insets.bottom + 12,
              }}
            >
              <View className="flex-row items-center justify-between px-5 py-3">
                <Text className="text-base font-semibold text-gray-950">
                  {t("filter_payment_history")}
                </Text>
                <View className="flex-row items-center gap-4">
                  <Pressable onPress={() => setDraft(emptyPaymentHistoryFilters)}>
                    <Text className="text-sm font-medium text-green-900">{t("reset")}</Text>
                  </Pressable>
                  <Pressable onPress={onClose} hitSlop={8}>
                    <X size={20} color="#6a7282" />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                nestedScrollEnabled
                style={{ flex: 1 }}
                contentContainerClassName="gap-5 px-5 pb-5"
              >
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-950">{t("date_range")}</Text>
                  <View className="flex-row gap-3">
                    <DateButton
                      label={t("from")}
                      value={draft.dateFrom}
                      onPress={() => setPicker("from")}
                      onClear={draft.dateFrom ? () => set("dateFrom", null) : undefined}
                    />
                    <DateButton
                      label={t("to")}
                      value={draft.dateTo}
                      onPress={() => setPicker("to")}
                      onClear={draft.dateTo ? () => set("dateTo", null) : undefined}
                    />
                  </View>
                </View>

                <ChipGroup
                  label={t("payment_status")}
                  options={options.statuses}
                  selected={draft.status}
                  onSelect={(value) => set("status", value)}
                />
                <ChipGroup
                  label={t("payment_cycle")}
                  options={options.paymentCycles}
                  selected={draft.paymentCycle}
                  onSelect={(value) => set("paymentCycle", value)}
                />
                <ChipGroup
                  label={t("payment_provider")}
                  options={options.providers}
                  selected={draft.provider}
                  onSelect={(value) => set("provider", value)}
                />

                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-950">
                    {t("payment_phone_number")}
                  </Text>
                  <TextInput
                    value={draft.phoneNumber}
                    onChangeText={(value) => set("phoneNumber", value)}
                    keyboardType="phone-pad"
                    placeholder={t("filter_by_phone_number")}
                    placeholderTextColor="#6b7280"
                    className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-950"
                  />
                </View>
              </ScrollView>

              <View className="px-5 pt-2">
                <Pressable
                  className="items-center rounded-full bg-green-900 py-3.5"
                  onPress={() => {
                    onApply(draft);
                    onClose();
                  }}
                >
                  <Text className="text-sm font-semibold text-white">{t("apply_filters")}</Text>
                </Pressable>
              </View>
            </View>
          </RNHostView>
        </ModalBottomSheet>
      </Host>

      {picker ? (
        <DateTimePicker
          mode="date"
          display="calendar"
          accentColor="#0d542b"
          value={
            new Date(
              (picker === "from" ? draft.dateFrom : draft.dateTo) ?? new Date().toISOString(),
            )
          }
          onValueChange={(_event, picked) => {
            set(picker === "from" ? "dateFrom" : "dateTo", picked.toISOString().slice(0, 10));
            setPicker(null);
          }}
          onDismiss={() => setPicker(null)}
        />
      ) : null}
    </>
  );
}

function DateButton({
  label,
  value,
  onPress,
  onClear,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-between rounded-xl bg-gray-100 px-3 py-2.5"
    >
      <View className="flex-row items-center gap-2">
        <CalendarDays size={16} color="#6a7282" />
        <View>
          <Text className="text-xs text-gray-500">{label}</Text>
          <Text className="text-sm font-medium text-gray-950">{value ?? "—"}</Text>
        </View>
      </View>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <X size={14} color="#6a7282" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
