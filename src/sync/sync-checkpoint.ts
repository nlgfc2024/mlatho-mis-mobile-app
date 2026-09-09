import type { SyncProgressState } from "./sync-progress";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SYNC_CHECKPOINT_KEY = "v1.sync.background-checkpoint";
const CHECKPOINT_VERSION = 1;

export type SyncCheckpoint = SyncProgressState & {
  version: typeof CHECKPOINT_VERSION;
  updatedAt: number;
};

export async function saveSyncCheckpoint(progress: SyncProgressState) {
  const checkpoint: SyncCheckpoint = {
    ...progress,
    version: CHECKPOINT_VERSION,
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(SYNC_CHECKPOINT_KEY, JSON.stringify(checkpoint));
}

export async function loadSyncCheckpoint(): Promise<SyncCheckpoint | null> {
  try {
    const value = await AsyncStorage.getItem(SYNC_CHECKPOINT_KEY);
    if (!value) return null;

    const checkpoint = JSON.parse(value) as Partial<SyncCheckpoint>;
    if (
      checkpoint.version !== CHECKPOINT_VERSION ||
      typeof checkpoint.session !== "string" ||
      !Array.isArray(checkpoint.steps)
    ) {
      await AsyncStorage.removeItem(SYNC_CHECKPOINT_KEY);
      return null;
    }

    return checkpoint as SyncCheckpoint;
  } catch (error) {
    console.warn("[Sync] Failed to restore the background checkpoint", error);
    return null;
  }
}

export async function clearSyncCheckpoint() {
  await AsyncStorage.removeItem(SYNC_CHECKPOINT_KEY);
}
