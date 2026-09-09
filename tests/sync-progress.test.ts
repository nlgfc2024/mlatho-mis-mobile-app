// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  markSyncResuming,
  markSyncWaitingToResume,
  pauseSyncSessionForOffline,
  resetSyncSession,
  runSyncStep,
  startSyncSession,
  syncProgressStore,
} from "../src/sync/sync-progress.ts";

test("an interrupted step returns to pending and can resume", async () => {
  resetSyncSession();
  startSyncSession("test", [{ id: "upload", label: "Upload" }]);

  await assert.rejects(
    runSyncStep("upload", async () => {
      throw new Error("Network request failed");
    }),
  );

  pauseSyncSessionForOffline();
  assert.equal(syncProgressStore.state.session, "paused_offline");
  assert.equal(syncProgressStore.state.steps[0]?.state, "pending");

  markSyncWaitingToResume();
  assert.equal(syncProgressStore.state.session, "waiting_to_resume");

  markSyncResuming();
  assert.equal(syncProgressStore.state.session, "resuming");
});
