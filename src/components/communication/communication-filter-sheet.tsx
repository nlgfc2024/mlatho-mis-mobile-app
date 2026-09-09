import { Host, ModalBottomSheet, RNHostView } from "@expo/ui/jetpack-compose";
import { X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  communicationFilterOptions,
  emptyCommunicationFilters,
  type CommunicationFilters,
} from "@/src/data/communications";
import { priorityLabelKey, typeLabelKey } from "./publication-visuals";

const SHEET_BACKGROUND = "#ffffff";
const SHEET_MAX_WIDTH = 640;

type CommunicationFilterSheetProps = {
  visible: boolean;
  filters: CommunicationFilters;
  onApply: (filters: CommunicationFilters) => void;
  onClose: () => void;
};

type Option = { value: string; label: string };

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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

export default function CommunicationFilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: CommunicationFilterSheetProps) {
  if (!visible) return null;

  return <MountedSheet filters={filters} onApply={onApply} onClose={onClose} />;
}

function MountedSheet({
  filters,
  onApply,
  onClose,
}: Omit<CommunicationFilterSheetProps, "visible">) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [draft, setDraft] = useState<CommunicationFilters>(filters);

  const sheetWidth = Math.min(width, SHEET_MAX_WIDTH);

  const set = <K extends keyof CommunicationFilters>(key: K, value: CommunicationFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Host matchContents>
      <ModalBottomSheet containerColor={SHEET_BACKGROUND} onDismissRequest={onClose}>
        <RNHostView matchContents>
          <View
            style={{
              width: sheetWidth,
              height: height * 0.75,
              paddingBottom: insets.bottom + 12,
            }}
          >
            <View className="flex-row items-center justify-between px-5 py-3">
              <Text className="text-base font-semibold text-gray-950">{t("filters")}</Text>
              <View className="flex-row items-center gap-4">
                <Pressable onPress={() => setDraft(emptyCommunicationFilters)}>
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
                label={t("publication_type")}
                options={communicationFilterOptions.type.map((value) => ({
                  value,
                  label: t(typeLabelKey[value]),
                }))}
                selected={draft.type}
                onSelect={(value) => set("type", value as CommunicationFilters["type"])}
              />

              <ChipGroup
                label={t("priority")}
                options={communicationFilterOptions.priority.map((value) => ({
                  value,
                  label: t(priorityLabelKey[value]),
                }))}
                selected={draft.priority}
                onSelect={(value) => set("priority", value as CommunicationFilters["priority"])}
              />

              <ChipGroup
                label={t("read_status")}
                options={[
                  { value: "unread", label: t("unread") },
                  { value: "read", label: t("read") },
                ]}
                selected={draft.readStatus}
                onSelect={(value) =>
                  set("readStatus", value as CommunicationFilters["readStatus"])
                }
              />

              <ChipGroup
                label={t("acknowledgement")}
                options={[
                  { value: "required", label: t("acknowledgement_required") },
                  { value: "not_required", label: t("acknowledgement_not_required") },
                ]}
                selected={
                  draft.requiresAcknowledgement === null
                    ? null
                    : draft.requiresAcknowledgement
                      ? "required"
                      : "not_required"
                }
                onSelect={(value) =>
                  set(
                    "requiresAcknowledgement",
                    value === null ? null : value === "required",
                  )
                }
              />
            </ScrollView>

            <View className="px-5 pt-1">
              <Pressable
                onPress={handleApply}
                className="items-center rounded-full bg-green-900 py-3.5"
              >
                <Text className="text-sm font-semibold text-white">{t("apply_filters")}</Text>
              </Pressable>
            </View>
          </View>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
