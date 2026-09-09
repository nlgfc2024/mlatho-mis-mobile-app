import type { SyncStatus } from "@powersync/react-native";

export type RecordSyncState =
  | "not_synced"
  | "syncing"
  | "synced"
  | "failed"
  | "pending_upload"
  | "conflict_detected";

export type ModuleSyncState = {
  state: RecordSyncState;
  label: string;
  lastSyncedAt?: Date;
  error?: string;
};

export function getRecordSyncState(record?: {
  $synced?: boolean;
  status?: string | null;
  synchronizedAt?: string | null;
}) {
  if (!record) return "not_synced" satisfies RecordSyncState;

  const status = record.status?.toLowerCase();
  if (status === "failed" || status === "error") return "failed" satisfies RecordSyncState;
  if (status === "conflict" || status === "conflict_detected") {
    return "conflict_detected" satisfies RecordSyncState;
  }
  if (record.$synced === false || status === "pending")
    return "pending_upload" satisfies RecordSyncState;
  if (record.$synced || record.synchronizedAt || status === "synchronized") {
    return "synced" satisfies RecordSyncState;
  }

  return "not_synced" satisfies RecordSyncState;
}

export function getModuleSyncState(status: SyncStatus): ModuleSyncState {
  const flow = status.dataFlowStatus;

  if (flow.uploadError || flow.downloadError) {
    return {
      state: "failed",
      label: "Failed",
      lastSyncedAt: status.lastSyncedAt,
      error: flow.uploadError?.message ?? flow.downloadError?.message,
    };
  }

  if (flow.uploading) {
    return {
      state: "pending_upload",
      label: "Pending upload",
      lastSyncedAt: status.lastSyncedAt,
    };
  }

  if (flow.downloading || status.connecting) {
    return {
      state: "syncing",
      label: "Syncing",
      lastSyncedAt: status.lastSyncedAt,
    };
  }

  if (status.connected && status.hasSynced) {
    return {
      state: "synced",
      label: "Synced",
      lastSyncedAt: status.lastSyncedAt,
    };
  }

  return {
    state: "not_synced",
    label: "Not synced",
    lastSyncedAt: status.lastSyncedAt,
  };
}
