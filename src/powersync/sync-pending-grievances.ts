import { grievancesCollection } from "./collections";
import {
  createGrievanceTicket,
  fetchGrievanceBackendTicket,
  fetchGrievanceTicketAttachmentFilenames,
  uploadGrievanceTicketAttachments,
} from "./grievance-api";
import {
  SYNCED_GRIEVANCE_STATUS,
  type GrievanceBackendUpdate,
  shouldSkipGrievanceUpload,
  syncGrievanceAttachmentQueue,
  syncGrievanceBackendUpdateQueue,
  syncGrievanceTicketQueue,
} from "./grievance-sync";
import { remoteSyncMetadata, waitForCollection } from "./remote-sync";

export async function syncPendingGrievances() {
  await waitForCollection(grievancesCollection);
  const records = await grievancesCollection.toArrayWhenReady();

  return syncGrievanceTicketQueue({
    records,
    createTicket: createGrievanceTicket,
    markSynced: async (record, result) => {
      const current = grievancesCollection.get(record.id);
      if (!current || shouldSkipGrievanceUpload(current)) return;

      const transaction = grievancesCollection.update(
        record.id,
        { metadata: remoteSyncMetadata() },
        (draft) => {
          draft.internalId = result.internalId;
          draft.clientMutationId = result.clientMutationId;
          draft.status = SYNCED_GRIEVANCE_STATUS;
          draft.synchronizedAt = result.synchronizedAt;
          draft.updatedAt = result.synchronizedAt;
        },
      );
      await transaction.isPersisted.promise;
    },
  });
}

export async function syncPendingGrievanceAttachments() {
  await waitForCollection(grievancesCollection);
  const records = await grievancesCollection.toArrayWhenReady();

  return syncGrievanceAttachmentQueue({
    records,
    listRemoteFilenames: fetchGrievanceTicketAttachmentFilenames,
    uploadAttachments: uploadGrievanceTicketAttachments,
    markUploaded: async (record, uploadedAt) => {
      const current = grievancesCollection.get(record.id);
      if (!current) return;

      const transaction = grievancesCollection.update(
        record.id,
        { metadata: remoteSyncMetadata() },
        (draft) => {
          draft.evidenceUploadedAt = uploadedAt;
        },
      );
      await transaction.isPersisted.promise;
    },
  });
}

export async function syncGrievanceBackendUpdates() {
  await waitForCollection(grievancesCollection);
  const records = await grievancesCollection.toArrayWhenReady();

  return syncGrievanceBackendUpdateQueue({
    records,
    fetchTicket: fetchGrievanceBackendTicket,
    applyUpdate: (record, update) => applyGrievanceBackendUpdate(record.id, update),
  });
}

export async function applyGrievanceBackendUpdate(
  recordId: string,
  update: GrievanceBackendUpdate,
) {
  const current = grievancesCollection.get(recordId);
  if (!current) return;

  const internalId = update.internalId ?? current.internalId;
  const clientMutationId = update.clientMutationId ?? current.clientMutationId;
  const synchronizedAt = current.synchronizedAt ?? update.synchronizedAt;

  if (
    current.internalId === internalId &&
    current.clientMutationId === clientMutationId &&
    current.status === update.status &&
    current.resolution === update.resolution &&
    current.comments === update.comments &&
    current.synchronizedAt === synchronizedAt &&
    current.updatedAt === update.updatedAt
  ) {
    return;
  }

  const transaction = grievancesCollection.update(
    recordId,
    { metadata: remoteSyncMetadata() },
    (draft) => {
      draft.internalId = internalId;
      draft.clientMutationId = clientMutationId;
      draft.status = update.status;
      draft.resolution = update.resolution;
      draft.comments = update.comments;
      // Keep the original upload timestamp used by the status timeline. The
      // backend refresh time is only a fallback for older synchronized rows.
      draft.synchronizedAt = synchronizedAt;
      draft.updatedAt = update.updatedAt;
    },
  );
  await transaction.isPersisted.promise;
}
