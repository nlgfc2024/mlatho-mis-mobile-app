import {
  UpdateType,
  type AbstractPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
} from "@powersync/react-native";
import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";
import { SECURE_STORAGE_KEYS, secureStorage } from "@/src/lib/secure-storage";
import {
  classifySyncError,
  recordSyncConflict,
  shouldRetrySyncError,
} from "@/src/powersync/conflicts";
import {
  createGrievanceTicket,
  uploadGrievanceTicketAttachments,
} from "@/src/powersync/grievance-api";
import {
  SYNCED_GRIEVANCE_STATUS,
  collectGrievanceAttachmentFiles,
  shouldSkipGrievanceUpload,
  syncGrievanceTicket,
} from "@/src/powersync/grievance-sync";
import { env } from "@/src/utils/env";

const CREATE_TICKET = gql`
  mutation CreateOfflineTicket(
    $title: String
    $category: String!
    $priority: String
    $incidentDate: Date
    $flags: String
    $channel: String
    $description: String
    $clientMutationId: String
  ) {
    createTicket(
      input: {
        title: $title
        category: $category
        priority: $priority
        channel: $channel
        dateOfIncident: $incidentDate
        flags: $flags
        description: $description
        clientMutationId: $clientMutationId
      }
    ) {
      internalId
      clientMutationId
    }
  }
`;

const SYNC_PAYMENT_ACCOUNT = gql`
  mutation SyncOfflinePaymentAccount(
    $accountProvider: String
    $accountNumber: String
    $accountName: String
    $householdId: String
    $clientMutationId: String
  ) {
    createTicket(
      input: {
        title: $accountProvider
        category: "PaymentAccount"
        description: $accountName
        flags: $accountNumber
        channel: $householdId
        clientMutationId: $clientMutationId
      }
    ) {
      internalId
      clientMutationId
    }
  }
`;

function payloadFor(operation: CrudEntry): Record<string, unknown> & { id: string } {
  return { ...((operation.opData ?? {}) as Record<string, unknown>), id: operation.id };
}

function safeJsonParse(value: unknown) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getOperationMetadata(operation: CrudEntry): Record<string, unknown> | null {
  const metadata = safeJsonParse(operation.metadata);

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

function isRemoteSyncSeed(operation: CrudEntry) {
  const metadata = getOperationMetadata(operation);
  return metadata?.intent === "remote-sync";
}

async function createTicketFromOperation(operation: CrudEntry, input: Record<string, unknown>) {
  await graphqlClient.request(CREATE_TICKET, {
    title: input.title ?? input.type ?? input.category ?? operation.table,
    category: input.category ?? "OfflineUpdate",
    priority: input.priority ?? "Medium",
    incidentDate: input.incidentDate ?? null,
    flags: input.flags ?? input.flag ?? input.villageId ?? operation.table,
    channel: input.channel ?? input.householdUuid ?? input.houseHoldId ?? "Mobile app",
    description:
      typeof input.description === "string"
        ? input.description
        : JSON.stringify(input.description ?? input),
    clientMutationId: operation.id,
  });
}

/**
 * Best-effort upload of the grievance's evidence right after the ticket is
 * created. Failures are only logged: the ticket itself is already synced, and
 * the "grievance-attachments" step of the sync task retries any grievance
 * without an `evidenceUploadedAt` marker.
 */
async function uploadGrievanceAttachmentsBestEffort(
  database: AbstractPowerSyncDatabase,
  recordId: string,
  record: Record<string, unknown>,
  locator: { internalId: string | null; clientMutationId: string | null },
) {
  const files = collectGrievanceAttachmentFiles(record);
  if (files.length === 0) return;

  try {
    const result = await uploadGrievanceTicketAttachments(locator, files);
    if (result.errors.length > 0) {
      console.warn(
        "[Grievance Sync] Some attachments failed to upload:",
        result.errors.map((error) => `${error.filename}: ${error.error}`).join("; "),
      );
      return;
    }

    await database.execute(`UPDATE grievances SET evidenceUploadedAt = ? WHERE id = ?`, [
      new Date().toISOString(),
      recordId,
    ]);
  } catch (error) {
    console.warn("[Grievance Sync] Attachment upload failed, will retry on next sync:", error);
  }
}

async function markGrievanceSynced(
  database: AbstractPowerSyncDatabase,
  recordId: string,
  input: { internalId: string; clientMutationId: string; synchronizedAt: string },
) {
  await database.execute(
    `
      UPDATE grievances
      SET internalId = ?, clientMutationId = ?, status = ?, synchronizedAt = ?, updatedAt = ?
      WHERE id = ?
    `,
    [
      input.internalId,
      input.clientMutationId,
      SYNCED_GRIEVANCE_STATUS,
      input.synchronizedAt,
      input.synchronizedAt,
      recordId,
    ],
  );
}

async function uploadOperation(database: AbstractPowerSyncDatabase, operation: CrudEntry) {
  if (isRemoteSyncSeed(operation)) {
    return;
  }

  const payload = payloadFor(operation);

  if (operation.op === UpdateType.DELETE) {
    await recordSyncConflict(database, {
      operation,
      reason: `Remote delete is not mapped for ${operation.table}.`,
      strategy: "manual",
    });
    return;
  }

  switch (operation.table) {
    case "grievances":
      if (shouldSkipGrievanceUpload(payload)) {
        return;
      }

      {
        const result = await syncGrievanceTicket({
          record: payload,
          createTicket: createGrievanceTicket,
          markSynced: (synced) => markGrievanceSynced(database, payload.id, synced),
        });
        await uploadGrievanceAttachmentsBestEffort(database, payload.id, payload, {
          internalId: result.internalId,
          clientMutationId: result.clientMutationId,
        });
      }
      return;

    case "pwpSessions":
      await createTicketFromOperation(operation, {
        title: payload.date ?? "PWP",
        category: "PWP",
        flags: payload.villageId ?? null,
        channel: "Mobile app",
        description: payload.notes ?? payload,
      });
      return;

    case "attendanceSessions":
      await createTicketFromOperation(operation, {
        title: payload.date ?? "Community session",
        category: payload.type ?? "CommunitySession",
        priority: "Medium",
        flags: payload.villageId ?? null,
        channel: "Mobile app",
        description: payload.notes ?? payload,
      });
      return;

    case "householdAttendance":
      await createTicketFromOperation(operation, {
        title: `Community attendance: ${payload.status ?? "unknown"}`,
        category: "CommunitySessionAttendance",
        priority: "Medium",
        flags: payload.sessionId ?? null,
        channel: payload.householdId ?? "Mobile app",
        description: {
          sessionId: payload.sessionId,
          householdId: payload.householdId,
          status: payload.status,
          verification: safeJsonParse(payload.remarks),
          recordedAt: payload.createdAt,
        },
      });
      return;

    case "pwpAttendance":
      await createTicketFromOperation(operation, {
        title: `PWP attendance: ${payload.status ?? "unknown"}`,
        category: "PWPAttendance",
        priority: "Medium",
        flags: payload.sessionId ?? null,
        channel: payload.householdId ?? "Mobile app",
        description: {
          sessionId: payload.sessionId,
          householdId: payload.householdId,
          status: payload.status,
          verification: safeJsonParse(payload.remarks),
          recordedAt: payload.createdAt,
        },
      });
      return;

    case "paymentAccounts":
      await graphqlClient.request(SYNC_PAYMENT_ACCOUNT, {
        accountProvider: payload.accountProvider ?? null,
        accountNumber: payload.accountNumber ?? null,
        accountName: payload.accountName ?? null,
        householdId: payload.houseHoldId ?? null,
        clientMutationId: operation.id,
      });
      return;

    case "householdChangeRequests": {
      const requestPayload = safeJsonParse(payload.payload);
      await createTicketFromOperation(operation, {
        title: payload.type ?? "Household update",
        category: "HouseholdCaseManagement",
        flags: payload.type ?? null,
        channel: payload.householdUuid ?? null,
        description: {
          type: payload.type,
          householdUuid: payload.householdUuid,
          memberUuid: payload.memberUuid,
          payload: requestPayload,
          requestedAt: payload.createdAt,
        },
      });
      return;
    }

    case "attachments":
      await recordSyncConflict(database, {
        operation,
        reason: "Attachment remote storage is not configured for PowerSync uploads.",
        strategy: "manual",
      });
      return;

    default:
      await recordSyncConflict(database, {
        operation,
        reason: `No PowerSync upload route is configured for ${operation.table}.`,
        strategy: "manual",
      });
  }
}

export function canConnectPowerSync() {
  return Boolean(
    env.POWERSYNC_URL && secureStorage.getString(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN),
  );
}

export class Connector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const token = secureStorage.getString(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN);

    if (!env.POWERSYNC_URL || !token) {
      return null;
    }

    return {
      endpoint: env.POWERSYNC_URL,
      token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    let transaction = await database.getNextCrudTransaction();

    while (transaction) {
      for (const operation of transaction.crud) {
        try {
          await uploadOperation(database, operation);
        } catch (error) {
          const kind = classifySyncError(error);

          if (shouldRetrySyncError(error)) {
            throw error;
          }

          await recordSyncConflict(database, {
            operation,
            reason: `${kind}: ${(error as Error)?.message ?? "Upload rejected by server."}`,
            strategy: kind === "conflict" ? "manual" : "server-wins",
          });
        }
      }

      await transaction.complete();
      transaction = await database.getNextCrudTransaction();
    }
  }
}
