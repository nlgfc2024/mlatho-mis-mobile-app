import { useStatus } from "@powersync/react-native";
import { AlertTriangle, Check, CloudOff, RefreshCw, UploadCloud } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { type RecordSyncState, getModuleSyncState } from "@/src/powersync/sync-state";

const stateStyles: Record<RecordSyncState, { bg: string; text: string; labelKey: string }> = {
  not_synced: { bg: "bg-gray-100", text: "text-gray-700", labelKey: "not_synced" },
  syncing: { bg: "bg-blue-100", text: "text-blue-700", labelKey: "syncing" },
  synced: { bg: "bg-green-100", text: "text-green-700", labelKey: "synced" },
  failed: { bg: "bg-red-100", text: "text-red-700", labelKey: "failed" },
  pending_upload: { bg: "bg-amber-100", text: "text-amber-700", labelKey: "pending_upload" },
  conflict_detected: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    labelKey: "conflict_detected",
  },
};

function StatusIcon({ state }: { state: RecordSyncState }) {
  const color = {
    not_synced: "#374151",
    syncing: "#1d4ed8",
    synced: "#15803d",
    failed: "#b91c1c",
    pending_upload: "#b45309",
    conflict_detected: "#7e22ce",
  }[state];

  if (state === "synced") return <Check size={12} color={color} strokeWidth={2.5} />;
  if (state === "syncing") return <RefreshCw size={12} color={color} strokeWidth={2.5} />;
  if (state === "pending_upload") return <UploadCloud size={12} color={color} strokeWidth={2.5} />;
  if (state === "failed" || state === "conflict_detected") {
    return <AlertTriangle size={12} color={color} strokeWidth={2.5} />;
  }
  return <CloudOff size={12} color={color} strokeWidth={2.5} />;
}

export function SyncStatusBadge({ state, label }: { state: RecordSyncState; label?: string }) {
  const { t } = useTranslation();
  const styles = stateStyles[state];

  return (
    <View className={`flex-row items-center gap-1 rounded-full p-1 ${styles.bg}`}>
      <StatusIcon state={state} />
      <Text className={`px-1 text-xs font-medium ${styles.text}`}>
        {label ?? t(styles.labelKey)}
      </Text>
    </View>
  );
}

export function PowerSyncStatusBanner() {
  const { t } = useTranslation();
  const status = useStatus();
  const summary = getModuleSyncState(status);

  if (summary.state === "synced") return null;

  return (
    <View className="border-b border-gray-200 bg-white px-4 py-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm font-medium text-gray-900">{t("data_sync")}</Text>
        <SyncStatusBadge state={summary.state} label={summary.label} />
      </View>
      {summary.error ? (
        <Text className="mt-1 text-xs text-red-700" numberOfLines={2}>
          {summary.error}
        </Text>
      ) : null}
    </View>
  );
}
