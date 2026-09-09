export class OfflineSyncError extends Error {
  constructor() {
    super("Sync paused because the device is offline.");
    this.name = "OfflineSyncError";
  }
}

export function isOfflineSyncError(error: unknown): error is OfflineSyncError {
  return error instanceof OfflineSyncError;
}

export function isTransientSyncError(error: unknown) {
  const candidate = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
    response?: { status?: unknown; errors?: { extensions?: { code?: unknown } }[] };
  };
  const rawStatus = candidate?.response?.status ?? candidate?.status;
  const status = rawStatus == null ? null : Number(rawStatus);
  const code = String(
    candidate?.response?.errors?.[0]?.extensions?.code ?? candidate?.code ?? "",
  ).toUpperCase();
  const message = String(candidate?.message ?? error ?? "").toLowerCase();

  return (
    status === 0 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status !== null && status >= 500) ||
    ["NETWORK_ERROR", "TIMEOUT", "INTERNAL_SERVER_ERROR", "SERVICE_UNAVAILABLE"].includes(code) ||
    /network|failed to fetch|load failed|timed? out|connection|socket|offline|result set is empty/.test(
      message,
    )
  );
}

export function exponentialBackoffDelay(attempt: number, baseDelayMs = 1_000, maxDelayMs = 30_000) {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
}

type RetryOptions = {
  maxAttempts?: number;
  isOnline: () => boolean;
  sleep?: (milliseconds: number) => Promise<void>;
};

export async function withSyncRetry<T>(operation: () => Promise<T>, options: RetryOptions) {
  const maxAttempts = options.maxAttempts ?? 3;
  const sleep =
    options.sleep ??
    ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (!options.isOnline()) throw new OfflineSyncError();

    try {
      return await operation();
    } catch (error) {
      if (!options.isOnline()) throw new OfflineSyncError();
      if (!isTransientSyncError(error) || attempt === maxAttempts) throw error;
      await sleep(exponentialBackoffDelay(attempt));
    }
  }

  throw new Error("Sync retry loop ended unexpectedly.");
}
