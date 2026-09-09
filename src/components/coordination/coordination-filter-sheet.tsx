import { CalendarDays, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  coordinationFilterOptions,
  emptyCoordinationFilters,
  type CoordinationFilters,
} from "@/src/data/coordination";

type Option = { value: string; label: string };

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? "rounded-full bg-green-900 px-3 py-2"
          : "rounded-full bg-gray-100 px-3 py-2 active:bg-gray-200 dark:bg-gray-800 dark:active:bg-gray-700"
      }
    >
      <Text
        selectable
        className={
          active
            ? "text-xs font-semibold text-white"
            : "text-xs font-medium text-gray-700 dark:text-gray-200"
        }
      >
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
  options: Option[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <Text selectable className="text-sm font-semibold text-gray-950 dark:text-gray-50">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label={t("all")} active={selected === null} onPress={() => onSelect(null)} />
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={selected === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <View className="flex-1 gap-1.5">
      <Text selectable className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </Text>
      <View className="flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 dark:bg-gray-800">
        <CalendarDays size={15} color="#6a7282" />
        <TextInput
          value={value ?? ""}
          onChangeText={(text) => onChange(text.trim() || null)}
          placeholder="YYYY-MM-DD"
          placeholderTextColorClassName="accent-gray-400 dark:accent-gray-500"
          cursorColorClassName="accent-green-900 dark:accent-green-200"
          className="flex-1 py-3 text-sm text-gray-950 dark:text-gray-50"
          autoCapitalize="none"
          maxLength={10}
        />
      </View>
    </View>
  );
}

type CoordinationFilterSheetProps = {
  visible: boolean;
  filters: CoordinationFilters;
  onApply: (filters: CoordinationFilters) => void;
  onClose: () => void;
};

export default function CoordinationFilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: CoordinationFilterSheetProps) {
  if (!visible) return null;

  return (
    <MountedCoordinationFilterSheet filters={filters} onApply={onApply} onClose={onClose} />
  );
}

function MountedCoordinationFilterSheet({
  filters,
  onApply,
  onClose,
}: Omit<CoordinationFilterSheetProps, "visible">) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(filters);

  const set = <K extends keyof CoordinationFilters>(
    key: K,
    value: CoordinationFilters[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        className="flex-1 bg-white dark:bg-gray-950"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <Text selectable className="text-lg font-semibold text-gray-950 dark:text-gray-50">
            {t("coordination_filters")}
          </Text>
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => setDraft(emptyCoordinationFilters)}>
              <Text selectable className="text-sm font-semibold text-green-800 dark:text-green-200">
                {t("reset")}
              </Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={21} color="#6a7282" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-6 px-5 py-5"
        >
          <ChipGroup
            label={t("activity_type")}
            options={coordinationFilterOptions.type.map((value) => ({
              value,
              label: t(`coordination_type_${value}`),
            }))}
            selected={draft.type}
            onSelect={(value) => set("type", value as CoordinationFilters["type"])}
          />
          <ChipGroup
            label={t("status")}
            options={coordinationFilterOptions.status.map((value) => ({
              value,
              label: t(`coordination_status_${value}`),
            }))}
            selected={draft.status}
            onSelect={(value) => set("status", value as CoordinationFilters["status"])}
          />
          <ChipGroup
            label={t("department")}
            options={coordinationFilterOptions.department.map((value) => ({
              value,
              label: value,
            }))}
            selected={draft.department}
            onSelect={(value) => set("department", value)}
          />
          <ChipGroup
            label={t("location")}
            options={coordinationFilterOptions.location.map((value) => ({
              value,
              label: value,
            }))}
            selected={draft.location}
            onSelect={(value) => set("location", value)}
          />
          <View className="gap-2">
            <Text selectable className="text-sm font-semibold text-gray-950 dark:text-gray-50">
              {t("date_range")}
            </Text>
            <View className="flex-row gap-3">
              <DateInput
                label={t("from")}
                value={draft.dateFrom}
                onChange={(value) => set("dateFrom", value)}
              />
              <DateInput
                label={t("to")}
                value={draft.dateTo}
                onChange={(value) => set("dateTo", value)}
              />
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-gray-100 px-5 pt-4 dark:border-gray-800">
          <Pressable
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            className="items-center rounded-full bg-green-900 py-3.5 active:bg-green-800"
          >
            <Text selectable className="text-sm font-semibold text-white">
              {t("apply_filters")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
