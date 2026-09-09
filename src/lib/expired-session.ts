import { Alert } from "react-native";

import i18n from "@/src/i18n";
import { SECURE_STORAGE_KEYS, secureStorage } from "@/src/lib/secure-storage";
import { usersCollection } from "@/src/powersync/collections";
import { isTokenExpiredError } from "@/src/utils/graphql-errors";

/**
 * Clears the expired JWT and marks every locally-known user as logged out.
 * The session provider's live query reacts to the user rows, so protected
 * routes close (and redirect to login) without needing a router here.
 */
export async function clearExpiredSession() {
  await secureStorage.remove(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN);

  const nowIso = new Date().toISOString();
  const allUsers = await usersCollection.toArrayWhenReady();
  for (const existing of allUsers) {
    if (!existing.isLoggedIn && existing.authToken == null) continue;
    const tx = usersCollection.update(existing.id, {}, (draft) => {
      draft.isLoggedIn = 0;
      draft.authToken = null;
      draft.updatedAt = nowIso;
    });
    await tx.isPersisted.promise;
  }
}

let handlingExpiry = false;

/**
 * Non-React counterpart of `useHandleExpiredToken` for code that runs outside
 * components (the background/auto sync pipeline). When the error is a JWT
 * expiry it logs the user out and tells them why; navigation follows from the
 * protected-route guards. Returns true when the error was an expiry error.
 */
export async function handleExpiredTokenError(error: unknown): Promise<boolean> {
  if (!isTokenExpiredError(error)) return false;

  // Several sync steps can fail with the same expired token; only the first
  // one needs to tear down the session and alert.
  if (handlingExpiry) return true;
  handlingExpiry = true;

  try {
    await clearExpiredSession();
    Alert.alert(i18n.t("session_expired"), i18n.t("session_expired_message"));
  } finally {
    handlingExpiry = false;
  }

  return true;
}
