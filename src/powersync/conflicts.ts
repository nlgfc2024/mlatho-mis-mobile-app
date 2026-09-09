import type { AbstractPowerSyncDatabase, CrudEntry } from "@powersync/react-native";
import { randomUUID } from "expo-crypto";

export type ConflictStrategy =
  | "last-write-wins"
  | "server-wins"
  | "client-wins"
  | "manual"
  | "field-merge";

export type SyncErrorKind = "auth" | "conflict" | "validation" | "transient" | "unknown";

export function classifySyncError(error: unknown): SyncErrorKind {
  const status = Number((error as any)?.response?.status ?? (error as any)?.status ?? 0);
  const graphQLErrors = (error as any)?.response?.errors ?? [];
  const code = graphQLErrors[0]?.extensions?.code ?? (error as any)?.code;
  const message = String((error as any)?.message ?? "").toLowerCase();

  if (status === 401 || status === 403 || code === "UNAUTHENTICATED") return "auth";
  if (status === 409 || code === "CONFLICT" || message.includes("conflict")) return "conflict";
  if (status === 400 || status === 422 || code === "BAD_USER_INPUT") return "validation";
  if (status === 0 || status >= 500 || message.includes("network")) return "transient";

  return "unknown";
}

export function shouldRetrySyncError(error: unknown) {
  const kind = classifySyncError(error);
  return kind === "auth" || kind === "transient" || kind === "unknown";
}

export async function recordSyncConflict(
  database: AbstractPowerSyncDatabase,
  input: {
    operation: CrudEntry;
    reason: string;
    strategy?: ConflictStrategy;
    remotePayload?: unknown;
    resolutionPayload?: unknown;
  },
) {
  const now = new Date().toISOString();

  await database.execute(
    `
      INSERT INTO syncConflicts
        (id, tableName, recordId, operation, status, reason, strategy, localPayload, remotePayload, resolutionPayload, createdAt, updatedAt, resolvedAt)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      input.operation.table,
      input.operation.id,
      input.operation.op,
      "open",
      input.reason,
      input.strategy ?? "manual",
      JSON.stringify(input.operation.opData ?? null),
      JSON.stringify(input.remotePayload ?? null),
      JSON.stringify(input.resolutionPayload ?? null),
      now,
      now,
      null,
    ],
  );
}
