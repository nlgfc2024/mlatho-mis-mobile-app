export type SessionTokenState = "missing" | "valid" | "expired" | "opaque";

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return globalThis.atob(padded);
}

/**
 * Performs the local portion of session validation without a network request.
 * Non-JWT tokens remain usable and are validated by the first authenticated
 * request. JWTs with an `exp` claim are rejected before any protected UI mounts.
 */
export function getSessionTokenState(
  token: string | null | undefined,
  nowMilliseconds = Date.now(),
): SessionTokenState {
  if (!token) return "missing";

  const parts = token.split(".");
  if (parts.length !== 3) return "opaque";

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return "opaque";
    return payload.exp * 1000 <= nowMilliseconds ? "expired" : "valid";
  } catch {
    return "opaque";
  }
}
