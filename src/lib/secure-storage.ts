import * as SecureStore from "expo-secure-store";

/**
 * Thin wrapper over expo-secure-store that keeps recently-read values in an
 * in-memory cache. SecureStore is async-only, but the GraphQL client and
 * PowerSync connector need to read the auth token synchronously while
 * building each request. Hydrating the cache at app startup lets callers
 * use {@link secureStorage.getString} synchronously.
 */
const cache = new Map<string, string | null>();

async function hydrate(keys: readonly string[]) {
  await Promise.all(
    keys.map(async (key) => {
      try {
        const value = await SecureStore.getItemAsync(key);
        cache.set(key, value);
      } catch (error) {
        console.warn(`[secureStorage] hydrate(${key}) failed`, error);
        cache.set(key, null);
      }
    }),
  );
}

function getString(key: string): string | null {
  return cache.get(key) ?? null;
}

function getBoolean(key: string): boolean {
  return cache.get(key) === "true";
}

async function setString(key: string, value: string) {
  cache.set(key, value);
  await SecureStore.setItemAsync(key, value);
}

async function setBoolean(key: string, value: boolean) {
  await setString(key, value ? "true" : "false");
}

async function remove(key: string) {
  cache.delete(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`[secureStorage] delete(${key}) failed`, error);
  }
}

export const secureStorage = {
  hydrate,
  getString,
  getBoolean,
  setString,
  setBoolean,
  remove,
};

/**
 * Keys persisted in SecureStore. Centralised so callers don't drift.
 */
export const SECURE_STORAGE_KEYS = {
  SESSION_AUTH_TOKEN: "v1.session.authToken",
  BIOMETRIC_AUTH_ENABLED: "v1.biometricAuth.enabled",
  BIOMETRIC_AUTH_USER_REFERENCE: "v1.biometricAuth.userReference",
  POWERSYNC_DATABASE_ENCRYPTION_KEY: "v1.powersync.databaseEncryptionKey",
} as const;

export const SECURE_STORAGE_HYDRATE_KEYS = [
  SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN,
  SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_ENABLED,
  SECURE_STORAGE_KEYS.BIOMETRIC_AUTH_USER_REFERENCE,
] as const;
