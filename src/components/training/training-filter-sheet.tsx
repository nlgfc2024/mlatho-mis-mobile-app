import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { CalendarDays, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  emptyTrainingFilters,
  formatTrainingStatus,
  getTrainingFilterOptions,
  type Training,
  type TrainingFilters,
} from "@/src/data/trainings";

const SHEET_BACKGROUND = "#ffffff";
const SHEET_MAX_WIDTH = 640;

type TrainingFilterSheetProps = {
  visible: boolean;
  trainings: Training[];
  filters: TrainingFilters;
  onApply: (filters: TrainingFilters) => void;
  onClose: () => void;
};

type Option = { value: string; label: string };

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
      <Text className="text-sm font-medium text-gray-950">{label}</Text>
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

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${active ? "bg-green-900" : "bg-gray-100"}`}
    >
      <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-700"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TrainingFilterSheet({
  visible,
  trainings,
  filters,
  onApply,
  onClose,
}: TrainingFilterSheetProps) {
  if (!visible) return null;

  return (
    <MountedTrainingFilterSheet
      filters={filters}
      trainings={trainings}
      onApply={onApply}
      onClose={onClose}
    />
  );
}

function MountedTrainingFilterSheet({
  trainings,
  filters,
  onApply,
  onClose,
}: Omit<TrainingFilterSheetProps, "visible">) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [draft, setDraft] = useState<TrainingFilters>(filters);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const trainingFilterOptions = getTrainingFilterOptions(trainings);

  const sheetWidth = Math.min(width, SHEET_MAX_WIDTH);

  const set = <K extends keyof TrainingFilters>(key: K, value: TrainingFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toOptions = (values: string[], toLabel: (value: string) => string): Option[] =>
    values.map((value) => ({ value, label: toLabel(value) }));

  const plain = (value: string) => value;

  return (
    <>
      <Host matchContents>
        <ModalBottomSheet containerColor={SHEET_BACKGROUND} onDismissRequest={onClose}>
          <RNHostView matchContents>
            <View
              style={{
                width: sheetWidth,
                height: height * 0.8,
                paddingBottom: insets.bottom + 12,
              }}
            >
              <View className="flex-row items-center justify-between px-5 py-3">
                <Text className="text-base font-semibold text-gray-950">{t("filters")}</Text>
                <View className="flex-row items-center gap-4">
                  <Pressable onPress={() => setDraft(emptyTrainingFilters)}>
                    <Text className="text-sm font-medium text-green-900">{t("reset")}</Text>
                  </Pressable>
                  <Pressable onPress={onClose} hitSlop={8}>
                    <X size={20} color="#6a7282" />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator
                style={{ flex: 1 }}
                contentContainerClassName="gap-5 px-5 pb-4"
              >
                <ChipGroup
                  label={t("status")}
                  options={toOptions(trainingFilterOptions.status, (value) =>
                    t(value, { defaultValue: formatTrainingStatus(value) }),
                  )}
                  selected={draft.status}
                  onSelect={(value) => set("status", value as TrainingFilters["status"])}
                />

                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-950">{t("date_range")}</Text>
                  <View className="flex-row gap-3">
                    <DateButton
                      label={t("from")}
                      value={formatDate(draft.dateFrom)}
                      onPress={() => setPicker("from")}
                      onClear={draft.dateFrom ? () => set("dateFrom", null) : undefined}
                    />
                    <DateButton
                      label={t("to")}
                      value={formatDate(draft.dateTo)}
                      onPress={() => setPicker("to")}
                      onClear={draft.dateTo ? () => set("dateTo", null) : undefined}
                    />
                  </View>
                </View>

                <ChipGroup
                  label={t("location")}
                  options={toOptions(trainingFilterOptions.location, plain)}
                  selected={draft.location}
                  onSelect={(value) => set("location", value)}
                />
                <ChipGroup
                  label={t("training_category")}
                  options={toOptions(trainingFilterOptions.category, plain)}
                  selected={draft.category}
                  onSelect={(value) => set("category", value)}
                />
                <ChipGroup
                  label={t("training_level")}
                  options={toOptions(trainingFilterOptions.level, plain)}
                  selected={draft.level}
                  onSelect={(value) => set("level", value)}
                />
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

      {picker && (
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
            const iso = picked.toISOString().slice(0, 10);
            set(picker === "from" ? "dateFrom" : "dateTo", iso);
            setPicker(null);
          }}
          onDismiss={() => setPicker(null)}
        />
      )}
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
