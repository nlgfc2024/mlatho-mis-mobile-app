import { ClientError } from "graphql-request";

const DEFAULT_LOGIN_ERROR_MESSAGE = "We couldn't sign you in. Please try again.";
const SESSION_EXPIRED_ERROR_MESSAGE = "Session expired. Please log in again.";

function normalizeMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}

function hasExpiredSignatureMessage(message: string | null | undefined): boolean {
  return Boolean(message?.toLowerCase().includes("signature has expired"));
}

/**
 * Returns true when the server rejects a request because the JWT has expired.
 * The server responds with HTTP 401 and an error message of "Signature has expired".
 */
export function isTokenExpiredError(error: unknown): boolean {
  if (typeof error === "string") {
    return hasExpiredSignatureMessage(error);
  }

  if (!(error instanceof ClientError)) {
    return error instanceof Error && hasExpiredSignatureMessage(error.message);
  }

  const status = error.response.status;
  const errors = error.response.errors ?? [];

  return (
    status === 401 ||
    hasExpiredSignatureMessage(error.message) ||
    errors.some((e) => hasExpiredSignatureMessage(e.message))
  );
}

export function getGraphQLErrorMessage(error: unknown, fallback: string): string {
  if (isTokenExpiredError(error)) {
    return SESSION_EXPIRED_ERROR_MESSAGE;
  }

  if (error instanceof ClientError) {
    const message = error.response.errors?.[0]?.message;
    return message || fallback;
  }

  if (typeof error === "string") {
    const message = normalizeMessage(error);
    return message && message.length < 140 ? message : fallback;
  }

  if (error instanceof Error && error.message && error.message.length < 140) {
    return normalizeMessage(error.message);
  }

  return fallback;
}

export function getLoginErrorMessage(error: unknown): string {
  const status = error instanceof ClientError ? error.response.status : null;
  const serverMessage =
    error instanceof ClientError ? error.response.errors?.[0]?.message : undefined;
  const message = normalizeMessage(serverMessage ?? (error instanceof Error ? error.message : ""));

  const retryAfter = message.match(/try again in\s+([^.!?]+)/i)?.[1]?.trim();
  if (/too many failed attempts/i.test(message) || status === 429) {
    return retryAfter
      ? `Too many unsuccessful sign-in attempts. Please try again in ${retryAfter}.`
      : "Too many unsuccessful sign-in attempts. Please wait a few minutes and try again.";
  }

  if (
    /invalid credentials|incorrect(?:[_\s-]+credentials| (?:username|password))|unable to log in|authentication failed/i.test(
      message,
    )
  ) {
    return "The username or password is incorrect.";
  }

  if (/inactive|disabled|locked account|account.*locked/i.test(message)) {
    return "This account is unavailable. Contact support for help.";
  }

  if (
    status === 0 ||
    /network request failed|failed to fetch|network error|load failed|timed? out|connection/i.test(
      message,
    )
  ) {
    return "Unable to connect. Check your internet connection and try again.";
  }

  return DEFAULT_LOGIN_ERROR_MESSAGE;
}
