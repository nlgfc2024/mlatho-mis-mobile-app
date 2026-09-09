import NetInfo from "@react-native-community/netinfo";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { handleExpiredTokenError } from "@/src/lib/expired-session";
import { SECURE_STORAGE_HYDRATE_KEYS, secureStorage } from "@/src/lib/secure-storage";
import {
  syncGrievanceBackendUpdates,
  syncPendingGrievanceAttachments,
  syncPendingGrievances,
} from "@/src/powersync/sync-pending-grievances";
import { setupPowerSync, waitForPowerSyncUploads } from "@/src/powersync/system";
import {
  clearSyncCheckpoint,
  loadSyncCheckpoint,
  saveSyncCheckpoint,
} from "@/src/sync/sync-checkpoint";
import {
  endSyncSession,
  markSyncResuming,
  markSyncWaitingToResume,
  pauseSyncSessionForOffline,
  resetSyncSession,
  restoreSyncSession,
  runSyncStep,
  startSyncSession,
  syncProgressStore,
  type SyncStepDefinition,
} from "@/src/sync/sync-progress";
import { isOfflineSyncError, OfflineSyncError, withSyncRetry } from "@/src/sync/sync-retry";
import { syncTrainings } from "@/src/sync/sync-trainings";

export const SYNC_TASK_NAME = "TASAF_SYNC_V1";

const SYNC_STEPS = [
  { id: "grievances", label: "Grievance upload", run: syncPendingGrievances },
  {
    id: "grievance-attachments",
    label: "Grievance attachments",
    run: syncPendingGrievanceAttachments,
  },
  { id: "grievance-updates", label: "Grievance updates", run: syncGrievanceBackendUpdates },
  {
    id: "powersync",
    label: "PowerSync upload",
    run: async () => {
      await setupPowerSync();
      await waitForPowerSyncUploads({ isOnline: () => syncNetworkAvailable });
    },
  },
  { id: "trainings", label: "Trainings download", run: syncTrainings },
] as const;

const SYNC_STEP_DEFINITIONS = SYNC_STEPS.map(({ id, label }) => ({
  id,
  label,
})) satisfies SyncStepDefinition[];

let activeSyncPromise: Promise<void> | null = null;
let syncNetworkAvailable = true;
let resumeAfterActiveSync = false;

async function persistProgress() {
  try {
    await saveSyncCheckpoint(syncProgressStore.state);
  } catch (error) {
    console.warn("[Sync] Failed to persist progress", error);
  }
}

export function setSyncConnectivity(isOnline: boolean) {
  syncNetworkAvailable = isOnline;

  if (!isOnline && activeSyncPromise) {
    pauseSyncSessionForOffline();
    void persistProgress();
  } else if (isOnline && syncProgressStore.state.session === "paused_offline") {
    if (activeSyncPromise) {
      resumeAfterActiveSync = true;
      markSyncResuming();
    } else {
      markSyncWaitingToResume();
    }
    void persistProgress();
  }
}

export async function restorePersistedSyncSession() {
  const checkpoint = await loadSyncCheckpoint();
  if (checkpoint) restoreSyncSession(checkpoint);
}

async function executeSync(source: string) {
  if (!syncNetworkAvailable) {
    if (syncProgressStore.state.steps.length === 0) {
      startSyncSession(source, SYNC_STEP_DEFINITIONS);
    }
    pauseSyncSessionForOffline();
    await persistProgress();
    throw new OfflineSyncError();
  }

  const checkpoint = await loadSyncCheckpoint();
  const isResuming = Boolean(checkpoint && !["idle", "succeeded"].includes(checkpoint.session));
  startSyncSession(source, SYNC_STEP_DEFINITIONS, isResuming ? "resuming" : "running");
  await persistProgress();

  try {
    for (const step of SYNC_STEPS) {
      await runSyncStep(
        step.id,
        () => withSyncRetry<unknown>(() => step.run(), { isOnline: () => syncNetworkAvailable }),
        persistProgress,
      );
      await persistProgress();
    }
    endSyncSession("succeeded");
    await clearSyncCheckpoint();
  } catch (err) {
    // Sync failures are represented in syncProgressStore and retried from the
    // queue. Logging them as console errors opens React Native's red error
    // overlay even for callers that intentionally use runSyncLogicInternal.
    console.warn(`[Sync] ${source} failed and will remain queued:`, err);

    if (isOfflineSyncError(err) || !syncNetworkAvailable) {
      pauseSyncSessionForOffline();
      await persistProgress();
      throw err;
    }

    // An expired JWT is a session problem, not a sync problem: log the user
    // out (with an explanatory alert) and drop the failure toast — retrying
    // without re-authenticating can never succeed.
    if (await handleExpiredTokenError(err)) {
      resetSyncSession();
      await clearSyncCheckpoint();
    } else {
      endSyncSession("failed");
      await persistProgress();
    }
    throw err;
  }
}

export const runSyncLogicOrThrow = (source: string) => {
  if (activeSyncPromise) return activeSyncPromise;

  const syncPromise = executeSync(source).finally(() => {
    if (activeSyncPromise === syncPromise) activeSyncPromise = null;

    if (
      resumeAfterActiveSync &&
      syncNetworkAvailable &&
      syncProgressStore.state.session !== "succeeded"
    ) {
      resumeAfterActiveSync = false;
      void runSyncLogicInternal("Network Recovery");
    } else if (!syncNetworkAvailable || syncProgressStore.state.session === "succeeded") {
      resumeAfterActiveSync = false;
    }
  });
  activeSyncPromise = syncPromise;
  return syncPromise;
};

export const runSyncLogicInternal = async (source: string) => {
  try {
    await runSyncLogicOrThrow(source);
    return true;
  } catch {
    return false;
  }
};

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  await secureStorage.hydrate(SECURE_STORAGE_HYDRATE_KEYS);
  const network = await NetInfo.fetch();
  const isOnline = network.isConnected === true && network.isInternetReachable !== false;
  setSyncConnectivity(isOnline);

  if (!isOnline) return BackgroundTask.BackgroundTaskResult.Success;

  try {
    await runSyncLogicOrThrow("Background OS");
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    return isOfflineSyncError(error)
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSyncAsync() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;

  await BackgroundTask.registerTaskAsync(SYNC_TASK_NAME, { minimumInterval: 15 });
  return true;
}
