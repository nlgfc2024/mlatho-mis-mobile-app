// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { deleteRemoteRecordsOutsideScope } from "../src/powersync/remote-sync.ts";

test("deletes out-of-scope cache records in bounded transactions", async () => {
  const records = Array.from({ length: 2_895 }, (_, index) => ({
    id: `village-${index}`,
    inScope: index < 20,
  }));
  const deleteBatches: string[][] = [];
  const deleteMetadata: unknown[] = [];

  const collection = {
    config: { syncMode: "eager" },
    isReady: () => true,
    toArrayWhenReady: async () => records,
    has: () => false,
    get: () => undefined,
    insert: () => ({ isPersisted: { promise: Promise.resolve() } }),
    update: () => ({ isPersisted: { promise: Promise.resolve() } }),
    delete: (keys: string[], config: { metadata?: unknown }) => {
      deleteBatches.push(keys);
      deleteMetadata.push(config.metadata);
      return { isPersisted: { promise: Promise.resolve() } };
    },
  };

  const deletedCount = await deleteRemoteRecordsOutsideScope(
    collection,
    (record) => record.inScope,
  );

  assert.equal(deletedCount, 2_875);
  assert.deepEqual(
    deleteBatches.map((batch) => batch.length),
    [1_000, 1_000, 875],
  );
  assert.equal(deleteBatches.flat().includes("village-0"), false);
  assert.equal(deleteBatches.flat().includes("village-2894"), true);
  assert.equal(
    deleteMetadata.every(
      (metadata) =>
        metadata?.intent === "remote-sync" && metadata?.conflictStrategy === "server-wins",
    ),
    true,
  );
});

test("does not create a cleanup transaction when every cache record is in scope", async () => {
  let deleteCallCount = 0;
  const records = [{ id: "village-1" }, { id: "village-2" }];
  const collection = {
    config: { syncMode: "eager" },
    isReady: () => true,
    toArrayWhenReady: async () => records,
    delete: () => {
      deleteCallCount += 1;
      return { isPersisted: { promise: Promise.resolve() } };
    },
  };

  const deletedCount = await deleteRemoteRecordsOutsideScope(collection, () => true);

  assert.equal(deletedCount, 0);
  assert.equal(deleteCallCount, 0);
});

test("fails a stalled cleanup transaction instead of leaving sync pending forever", async () => {
  const collection = {
    config: { syncMode: "eager" },
    isReady: () => true,
    toArrayWhenReady: async () => [{ id: "stale-village" }],
    delete: () => ({ isPersisted: { promise: new Promise(() => {}) } }),
  };

  await assert.rejects(
    deleteRemoteRecordsOutsideScope(collection, () => false, {
      persistenceTimeoutMs: 5,
    }),
    /Timed out removing 1 out-of-scope cache record/,
  );
});
