import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Calendar, Eye, ScanLine, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";

import CameraPhotoInput, {
  BIRTH_CERTIFICATE_SCAN_ASPECT_RATIO,
  IDENTITY_SCAN_ASPECT_RATIO,
} from "@/src/components/form/camera-photo-input";
import Input from "@/src/components/form/input";
import { useWhitespaceNormalizedTextInput } from "@/src/components/form/normalize-whitespace";
import SegmentedPicker from "@/src/components/form/segmented-picker";
import Select from "@/src/components/form/select";
import SwitchRow from "@/src/components/form/switch-row";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { formatDateLabel, formatDateValue, getDateFromValue } from "@/src/form/household-member";

type Option<Value extends string> = {
  label: string;
  value: Value;
};

type FieldShellProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
};

function flattenErrors(errors: unknown[]): string[] {
  return errors.flatMap((error) => {
    if (!error) return [];
    if (Array.isArray(error)) return flattenErrors(error);
    if (typeof error === "string") return [error];
    if (typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === "string" ? [message] : [];
    }
    return [];
  });
}

export function getVisibleFieldError(meta: { isTouched: boolean; errors: unknown[] }) {
  if (!meta.isTouched) return undefined;

  return flattenErrors(meta.errors).join(", ") || undefined;
}

function FieldShell({ label, error, children }: FieldShellProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      {children}
      {error ? (
        <Text selectable className="text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type MemberTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: KeyboardTypeOptions;
};

export function MemberTextField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder,
  autoCapitalize = "sentences",
  keyboardType,
}: MemberTextFieldProps) {
  return (
    <FieldShell label={label} error={error}>
      <Input
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        accessibilityLabel={label}
      />
    </FieldShell>
  );
}

type MemberSelectFieldProps<Value extends string> = {
  label: string;
  value: Value | "";
  options: readonly Option<Value>[];
  onChange: (value: Value) => void;
  error?: string;
  placeholder: string;
};

export function MemberSelectField<Value extends string>({
  label,
  value,
  options,
  onChange,
  error,
  placeholder,
}: MemberSelectFieldProps<Value>) {
  return (
    <FieldShell label={label} error={error}>
      <Select value={value || undefined} onValueChange={onChange} placeholder={placeholder}>
        {options.map((option) => (
          <Select.Option key={option.value} item={option.value}>
            {option.label}
          </Select.Option>
        ))}
      </Select>
    </FieldShell>
  );
}

type MemberIdentityFieldsProps<Value extends string> = {
  typeValue: Value | "";
  typeOptions: readonly Option<Value>[];
  onTypeChange: (value: Value) => void;
  typeError?: string;
  typePlaceholder?: string;
  numberValue: string;
  onNumberChangeText: (value: string) => void;
  onNumberBlur: () => void;
  numberError?: string;
  numberPlaceholder?: string;
  numberAccessibilityLabel?: string;
};

export function MemberIdentityFields<Value extends string>({
  typeValue,
  typeOptions,
  onTypeChange,
  typeError,
  typePlaceholder = "Select ID type",
  numberValue,
  onNumberChangeText,
  onNumberBlur,
  numberError,
  numberPlaceholder = "Enter ID number",
  numberAccessibilityLabel = "ID number",
}: MemberIdentityFieldsProps<Value>) {
  const isDark = useColorScheme() === "dark";
  const rowSeparatorStyle = useRowSeparatorStyle("top");
  const { handleBlur, handleChangeText } = useWhitespaceNormalizedTextInput({
    onBlur: onNumberBlur,
    onChangeText: onNumberChangeText,
    value: numberValue,
  });
  const errors = [typeError, numberError].filter((error): error is string => Boolean(error));

  return (
    <View className="gap-2">
      <View className="overflow-hidden rounded-xl bg-gray-100 py-1 dark:bg-gray-800">
        <Select
          value={typeValue || undefined}
          onValueChange={onTypeChange}
          placeholder={typePlaceholder}
        >
          {typeOptions.map((option) => (
            <Select.Option key={option.value} item={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>

        <View className="px-4">
          <View style={rowSeparatorStyle} />
        </View>

        <TextInput
          value={numberValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          placeholder={numberPlaceholder}
          placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
          autoCapitalize="characters"
          accessibilityLabel={numberAccessibilityLabel}
          className="px-4 py-3 text-sm text-gray-950 dark:text-gray-50"
        />
      </View>

      {errors.length > 0 ? (
        <Text selectable className="text-sm text-red-600 dark:text-red-400">
          {errors.join(", ")}
        </Text>
      ) : null}
    </View>
  );
}

type MemberSegmentedFieldProps<Value extends string> = {
  label: string;
  value: Value | "";
  options: readonly Option<Value>[];
  onChange: (value: Value) => void;
  error?: string;
  hideLabel?: boolean;
};

export function MemberSegmentedField<Value extends string>({
  label,
  value,
  options,
  onChange,
  error,
  hideLabel = false,
}: MemberSegmentedFieldProps<Value>) {
  const selectedIndex = options.findIndex((option) => option.value === value);

  if (hideLabel) {
    return (
      <View className="gap-2">
        <SegmentedPicker
          options={options.map((option) => option.label)}
          selectedIndex={selectedIndex === -1 ? null : selectedIndex}
          fullWidth
          onOptionSelected={(index) => {
            const option = options[index];
            if (option) onChange(option.value);
          }}
        />
        {error ? (
          <Text selectable className="text-sm text-red-600 dark:text-red-400">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <FieldShell label={label} error={error}>
      <SegmentedPicker
        options={options.map((option) => option.label)}
        selectedIndex={selectedIndex === -1 ? null : selectedIndex}
        fullWidth
        onOptionSelected={(index) => {
          const option = options[index];
          if (option) onChange(option.value);
        }}
      />
    </FieldShell>
  );
}

type MemberSwitchFieldProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
};

export function MemberSwitchField({ label, value, onChange, error }: MemberSwitchFieldProps) {
  return (
    <View className="gap-2">
      <SwitchRow label={label} value={value} onValueChange={onChange} />
      {error ? (
        <Text selectable className="text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type MemberDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
};

export function MemberDateField({ label, value, onChange, onBlur, error }: MemberDateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const isDark = useColorScheme() === "dark";
  const pickerValue = getDateFromValue(value) ?? new Date();

  return (
    <FieldShell label={label} error={error}>
      {showPicker && (
        <DateTimePicker
          mode="date"
          value={pickerValue}
          display="calendar"
          maximumDate={new Date()}
          accentColor="#0d542b"
          onValueChange={(_event, picked) => {
            if (picked) onChange(formatDateValue(picked));
            onBlur();
            setShowPicker(false);
          }}
          onDismiss={() => {
            onBlur();
            setShowPicker(false);
          }}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setShowPicker(true)}
        className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
      >
        <View className="flex-row items-center gap-2">
          <Calendar size={18} color={isDark ? "#9ca3af" : "#4a5565"} />
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
        </View>
        <View className="rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-gray-700">
          <Text
            className={`text-sm font-semibold ${value ? "text-gray-950 dark:text-gray-50" : "text-gray-500 dark:text-gray-400"}`}
          >
            {formatDateLabel(value)}
          </Text>
        </View>
      </Pressable>
    </FieldShell>
  );
}

function IdentityScanPreview({
  uri,
  onRemove,
  aspectRatio,
  scanSubject,
}: {
  uri: string;
  onRemove: () => void;
  aspectRatio: number;
  scanSubject: string;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const subjectLabel = scanSubject || t("document");

  return (
    <>
      <View className="overflow-hidden rounded-xl bg-white dark:bg-gray-900">
        <Pressable
          accessibilityLabel={t("preview_scan", { subject: subjectLabel })}
          accessibilityRole="imagebutton"
          onPress={() => setIsPreviewOpen(true)}
          className="w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
          style={{ aspectRatio }}
        >
          <Image source={{ uri }} className="size-full rounded-xl" resizeMode="cover" />
          <View className="absolute right-3 bottom-3 items-center justify-center rounded-full bg-black/45 p-2">
            <Eye size={16} color="#ffffff" />
          </View>
        </Pressable>

        <View className="flex-row items-center gap-3 px-3 py-3">
          <Text className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("scan_captured")}
          </Text>
          <Pressable
            onPress={() => {
              setIsPreviewOpen(false);
              onRemove();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("remove_scan", { subject: subjectLabel })}
            hitSlop={8}
            className="size-9 items-center justify-center rounded-full bg-gray-100 active:bg-pressed-control dark:bg-gray-800"
          >
            <X size={16} color={isDark ? "#9ca3af" : "#4a5565"} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isPreviewOpen}
        animationType="fade"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View className="absolute top-0 right-0 z-10 px-5 pt-14">
            <Pressable
              accessibilityLabel={`Close ${subjectLabel} scan preview`}
              accessibilityRole="button"
              onPress={() => setIsPreviewOpen(false)}
              className="items-center justify-center rounded-full bg-white/20 p-3"
            >
              <X size={24} color="#ffffff" />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-4 py-20">
            <Image
              source={{ uri }}
              className="w-full rounded-xl"
              resizeMode="contain"
              style={{ aspectRatio }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

type MemberIdentityScanFieldProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  scanSubject?: string;
  aspectRatio?: number;
};

export function MemberIdentityScanField({
  value,
  onChange,
  error,
  scanSubject = "identity",
  aspectRatio = IDENTITY_SCAN_ASPECT_RATIO,
}: MemberIdentityScanFieldProps) {
  const isDark = useColorScheme() === "dark";
  const subjectLabel = scanSubject || "document";

  return (
    <View className="gap-2">
      <View className="gap-3">
        {value ? (
          <IdentityScanPreview
            uri={value}
            onRemove={() => onChange(null)}
            aspectRatio={aspectRatio}
            scanSubject={subjectLabel}
          />
        ) : null}

        <View className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <ScanLine size={18} color={isDark ? "#9ca3af" : "#4a5565"} />
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {value ? `Rescan ${subjectLabel}` : `Scan ${subjectLabel}`}
            </Text>
          </View>
          <CameraPhotoInput
            value={value}
            onChange={(uri) => onChange(uri)}
            aspectRatio={aspectRatio}
            accessibilityLabel={`Scan ${subjectLabel}`}
            permissionMessage={`Camera permission is needed to scan ${subjectLabel}.`}
            scanErrorMessage={`The ${subjectLabel} scan could not be captured. Please try again.`}
          />
        </View>
      </View>
      {error ? (
        <Text selectable className="text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function getMemberDocumentScanAspectRatio(documentType: string | null | undefined) {
  return documentType === "Birth Certificate"
    ? BIRTH_CERTIFICATE_SCAN_ASPECT_RATIO
    : IDENTITY_SCAN_ASPECT_RATIO;
}

export type ReviewRow = {
  label: string;
  value: string;
};

export function MemberReviewSummary({ rows }: { rows: ReviewRow[] }) {
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.label}
          className="flex-row items-start justify-between gap-4 py-3"
          style={index === rows.length - 1 ? undefined : rowSeparatorStyle}
        >
          <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">{row.label}</Text>
          <Text
            selectable
            className="min-w-0 flex-1 text-right text-sm font-normal text-gray-600 dark:text-gray-400"
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
