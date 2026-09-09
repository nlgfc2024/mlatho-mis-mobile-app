import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import { clearExpiredSession } from "@/src/lib/expired-session";
import { isTokenExpiredError } from "@/src/utils/graphql-errors";

/**
 * Returns a handler that checks whether an error is a JWT expiry error.
 * If it is, it clears the stored token, marks every user record as logged
 * out in the local TanStack DB collection, redirects to the login screen,
 * and shows an alert.
 *
 * Returns true if the error was an expired-token error, false otherwise.
 * For code that runs outside React (the auto-sync pipeline), use
 * `handleExpiredTokenError` from `@/src/lib/expired-session` instead.
 */
export function useHandleExpiredToken() {
  const router = useRouter();
  const { t } = useTranslation();

  return useCallback(
    async function handleIfExpired(error: unknown): Promise<boolean> {
      if (!isTokenExpiredError(error)) return false;

      await clearExpiredSession();

      router.replace("/");

      Alert.alert(t("session_expired"), t("session_expired_message"), [
        { text: t("login"), onPress: () => router.replace("/") },
      ]);

      return true;
    },
    [router, t],
  );
}
