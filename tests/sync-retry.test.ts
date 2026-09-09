// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  OfflineSyncError,
  exponentialBackoffDelay,
  isTransientSyncError,
  withSyncRetry,
} from "../src/sync/sync-retry.ts";

test("sync retry uses exponential delays for transient failures", async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await withSyncRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("Network request failed");
      return "done";
    },
    {
      isOnline: () => true,
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    },
  );

  assert.equal(result, "done");
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
});

test("sync retry recovers from a transient empty PowerSync result", async () => {
  let attempts = 0;

  const result = await withSyncRetry(
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("Result set is empty");
      return "done";
    },
    {
      isOnline: () => true,
      sleep: async () => undefined,
    },
  );

  assert.equal(result, "done");
  assert.equal(attempts, 2);
});

test("sync retry pauses immediately when connectivity is lost", async () => {
  await assert.rejects(
    withSyncRetry(async () => "unreachable", { isOnline: () => false }),
    OfflineSyncError,
  );
});

test("only transient server and network failures are retried", () => {
  assert.equal(isTransientSyncError({ status: 503 }), true);
  assert.equal(isTransientSyncError({ status: 422, message: "Invalid input" }), false);
  assert.equal(isTransientSyncError(new Error("Invalid input")), false);
  assert.equal(exponentialBackoffDelay(8, 1_000, 30_000), 30_000);
});
