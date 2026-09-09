import { createLiveQueryCollection, type Collection } from "@tanstack/react-db";

type PowerSyncCollection<T extends { id: string }> = {
  config?: { syncMode?: string };
  isReady: () => boolean;
  toArrayWhenReady: () => Promise<T[]>;
  has: (key: string) => boolean;
  get: (key: string) => T | undefined;
  insert: (
    record: T,
    config?: { metadata?: Record<string, unknown> },
  ) => {
    isPersisted: { promise: Promise<unknown> };
  };
  update: (
    key: string,
    config: { metadata?: Record<string, unknown> },
    callback: (draft: T) => void,
  ) => { isPersisted: { promise: Promise<unknown> } };
  delete: (
    key: string | string[],
    config?: { metadata?: Record<string, unknown> },
  ) => {
    isPersisted: { promise: Promise<unknown> };
  };
};

const REMOTE_SCOPE_DELETE_BATCH_SIZE = 1_000;
const REMOTE_SCOPE_DELETE_TIMEOUT_MS = 30_000;

const fullCollectionLoaders = new WeakMap<object, { preload: () => Promise<void> }>();

export function remoteSyncMetadata() {
  return {
    intent: "remote-sync",
    conflictStrategy: "server-wins",
    createdAt: new Date().toISOString(),
  };
}

export async function waitForCollection<T extends { id: string }>(
  collection: PowerSyncCollection<T>,
) {
  if (collection.config?.syncMode === "on-demand") {
    let loader = fullCollectionLoaders.get(collection);
    if (!loader) {
      const source = collection as unknown as Collection<T, string>;
      loader = createLiveQueryCollection((q) => q.from({ record: source }));
      fullCollectionLoaders.set(collection, loader);
    }
    await loader.preload();
    return;
  }

  if (collection.isReady()) return;
  await collection.toArrayWhenReady();
}

export async function upsertRemoteRecord<T extends { id: string }>(
  collection: PowerSyncCollection<T>,
  record: T,
) {
  await waitForCollection(collection);

  if (collection.has(record.id)) {
    const transaction = collection.update(
      record.id,
      { metadata: remoteSyncMetadata() },
      (draft) => {
        Object.assign(draft, record);
      },
    );
    await transaction.isPersisted.promise;
    return;
  }

  const transaction = collection.insert(record, { metadata: remoteSyncMetadata() });
  await transaction.isPersisted.promise;
}

export async function upsertLocalRecord<T extends { id: string }>(
  collection: PowerSyncCollection<T>,
  record: T,
) {
  await waitForCollection(collection);

  if (collection.has(record.id)) {
    const transaction = collection.update(record.id, {}, (draft) => {
      Object.assign(draft, record);
    });
    await transaction.isPersisted.promise;
    return;
  }

  const transaction = collection.insert(record);
  await transaction.isPersisted.promise;
}

export async function deleteRemoteRecordsOutsideScope<T extends { id: string }>(
  collection: PowerSyncCollection<T>,
  isInScope: (record: T) => boolean,
  options: { batchSize?: number; persistenceTimeoutMs?: number } = {},
) {
  await waitForCollection(collection);
  const records = await collection.toArrayWhenReady();
  const recordIds = records.filter((record) => !isInScope(record)).map((record) => record.id);
  const batchSize = options.batchSize ?? REMOTE_SCOPE_DELETE_BATCH_SIZE;
  const persistenceTimeoutMs = options.persistenceTimeoutMs ?? REMOTE_SCOPE_DELETE_TIMEOUT_MS;

  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error("Remote scope delete batch size must be a positive integer.");
  }
  if (!Number.isFinite(persistenceTimeoutMs) || persistenceTimeoutMs <= 0) {
    throw new Error("Remote scope delete timeout must be a positive number.");
  }

  for (let offset = 0; offset < recordIds.length; offset += batchSize) {
    const batch = recordIds.slice(offset, offset + batchSize);
    const transaction = collection.delete(batch, { metadata: remoteSyncMetadata() });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        transaction.isPersisted.promise,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            reject(new Error(`Timed out removing ${batch.length} out-of-scope cache record(s).`));
          }, persistenceTimeoutMs);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return recordIds.length;
}

export async function findCollectionRecord<T extends { id: string }>(
  collection: PowerSyncCollection<T>,
  predicate: (record: T) => boolean,
) {
  await waitForCollection(collection);
  return collection.toArrayWhenReady().then((records) => records.find(predicate));
}
