import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Sync-cached wrapper over AsyncStorage. AsyncStorage is async-only, but
 * preferences are read synchronously when their provider mounts. Hydrating
 * the cache at app startup lets callers continue using `getString` /
 * `getBoolean` synchronously, mirroring the `secureStorage` shape.
 *
 * For genuinely async use (e.g. React Query's persister), call AsyncStorage
 * directly instead — see `asyncClientStorage` below.
 */
const cache = new Map<string, string | null>();

let hydrated = false;
const hydrationListeners = new Set<() => void>();

async function hydrate(keys: readonly string[]) {
  await Promise.all(
    keys.map(async (key) => {
      try {
        const value = await AsyncStorage.getItem(key);
        cache.set(key, value);
      } catch (error) {
        console.warn(`[localStorage] hydrate(${key}) failed`, error);
        cache.set(key, null);
      }
    }),
  );
  hydrated = true;
  for (const listener of hydrationListeners) listener();
  hydrationListeners.clear();
}

async function hydratePrefixes(prefixes: readonly string[]) {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
      prefixes.some((prefix) => key.startsWith(prefix)),
    );
    const entries = await AsyncStorage.multiGet(keys);
    for (const [key, value] of entries) cache.set(key, value);
  } catch (error) {
    console.warn("[localStorage] prefix hydration failed", error);
  }
}

/**
 * Module-level stores read the cache at import time, which happens before
 * `hydrate` runs at startup. They register here to re-read once the persisted
 * values are actually available. Runs immediately if hydration already happened.
 */
function onHydrated(listener: () => void) {
  if (hydrated) {
    listener();
    return;
  }
  hydrationListeners.add(listener);
}

function getString(key: string): string | null {
  return cache.get(key) ?? null;
}

function getBoolean(key: string): boolean | null {
  const value = cache.get(key);
  if (value == null) return null;
  return value === "true";
}

async function setString(key: string, value: string) {
  cache.set(key, value);
  await AsyncStorage.setItem(key, value);
}

async function setBoolean(key: string, value: boolean) {
  await setString(key, value ? "true" : "false");
}

async function remove(key: string) {
  cache.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`[localStorage] remove(${key}) failed`, error);
  }
}

export const localStorage = {
  hydrate,
  hydratePrefixes,
  onHydrated,
  getString,
  getBoolean,
  setString,
  setBoolean,
  remove,
};

/**
 * Keys to hydrate on app startup. Add any synchronous reads here.
 */
export const LOCAL_STORAGE_HYDRATE_KEYS = [
  "v1.app.language",
  "v1.app.theme",
  "v1.app.notifications",
  "v1.app.screenshotsAllowed",
  "v1.communication.read-state",
  "v1.dashboard.tiles",
  "v1.dashboard.active-group",
] as const;

export const LOCAL_STORAGE_HYDRATE_PREFIXES = ["v1.access-profile.active-role."] as const;

/**
 * React Query's persister speaks an async getItem/setItem/removeItem API —
 * we hand AsyncStorage straight through.
 */
export const asyncClientStorage = {
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
