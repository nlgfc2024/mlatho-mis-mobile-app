import type { CurrentUserLocationScope } from "@/src/sync/current-user-location-scope";

import { regionsCollection, syncMetadataCollection } from "@/src/powersync/collections";
import {
  deleteRemoteRecordsOutsideScope,
  upsertRemoteRecord,
  waitForCollection,
} from "@/src/powersync/remote-sync";
import { fetchCurrentUserLocationScope } from "@/src/sync/current-user-location-scope";
import { createSyncProgressPublisher } from "@/src/sync/update-status";
import { getGraphQLErrorMessage } from "@/src/utils/graphql-errors";
const SYNC_KEY = "regions";

export async function syncRegions(providedScope?: CurrentUserLocationScope) {
  const scope = providedScope ?? (await fetchCurrentUserLocationScope());
  let syncedCount = 0;
  const publishProgress = createSyncProgressPublisher(SYNC_KEY, {
    module: "location-hierarchy",
    locationId: scope.scopeKey,
    userId: scope.userId,
  });

  try {
    await waitForCollection(syncMetadataCollection);
    await publishProgress(null, syncedCount, { force: true });

    for (const region of scope.regions) {
      const timestamp = new Date().toISOString();
      await upsertRemoteRecord(regionsCollection, {
        id: region.id,
        legacyId: region.legacyId ?? null,
        reference: region.id,
        uuid: region.uuid,
        name: region.name?.trim() || "Unnamed region",
        code: region.code ?? null,
        synchronizedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
      syncedCount += 1;
      await publishProgress(null, syncedCount);
    }

    const regionUuids = new Set(scope.regions.map((region) => region.uuid));
    await deleteRemoteRecordsOutsideScope(regionsCollection, (region) =>
      region.uuid ? regionUuids.has(region.uuid) : false,
    );
    await publishProgress(null, syncedCount, { force: true, status: "completed" });
  } catch (error) {
    await publishProgress(null, syncedCount, {
      error: getGraphQLErrorMessage(error, "Regions sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}
