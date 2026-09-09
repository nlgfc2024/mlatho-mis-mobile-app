import { syncMetadataCollection } from "@/src/powersync/collections";
import { upsertLocalRecord } from "@/src/powersync/remote-sync";

export type OnboardingSyncStatus = "idle" | "syncing" | "completed" | "error";

type UpdateStatusOptions = {
  module?: string | null;
  locationId?: string | null;
  userId?: string | null;
  error?: string | null;
  syncedCount?: number | null;
};

type SyncProgressPublisherOptions = Omit<UpdateStatusOptions, "error" | "syncedCount">;

function nowIso() {
  return new Date().toISOString();
}

export async function updateStatus(
  key: string,
  value: OnboardingSyncStatus,
  cursor: string | null,
  options: UpdateStatusOptions = {},
) {
  const timestamp = nowIso();
  const existing = syncMetadataCollection.get(key);

  await upsertLocalRecord(syncMetadataCollection, {
    id: key,
    key,
    module: options.module ?? null,
    locationId: options.locationId ?? null,
    userId: options.userId ?? existing?.userId ?? null,
    value,
    status: value,
    syncedCount: options.syncedCount ?? existing?.syncedCount ?? null,
    cursor,
    error: options.error ?? null,
    pendingUploadCount: null,
    conflictCount: null,
    lastSyncedAt: value === "completed" ? timestamp : (existing?.lastSyncedAt ?? null),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  });
}

export function createSyncProgressPublisher(
  key: string,
  baseOptions: SyncProgressPublisherOptions,
  intervalMs = 250,
) {
  let lastPublishedAt = 0;
  let lastPublishedCount: number | null = null;

  return async (
    cursor: string | null,
    syncedCount: number,
    options: {
      error?: string | null;
      force?: boolean;
      status?: OnboardingSyncStatus;
    } = {},
  ) => {
    const status = options.status ?? "syncing";
    const now = Date.now();
    const countChanged = lastPublishedCount !== syncedCount;

    if (
      status === "syncing" &&
      !options.force &&
      (!countChanged || now - lastPublishedAt < intervalMs)
    ) {
      return;
    }

    lastPublishedAt = now;
    lastPublishedCount = syncedCount;

    await updateStatus(key, status, cursor, {
      ...baseOptions,
      error: options.error,
      syncedCount,
    });
  };
}
