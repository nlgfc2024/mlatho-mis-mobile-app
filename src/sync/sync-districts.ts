import type { CurrentUserLocationScope } from "@/src/sync/current-user-location-scope";

import {
  districtsCollection,
  regionsCollection,
  syncMetadataCollection,
} from "@/src/powersync/collections";
import {
  deleteRemoteRecordsOutsideScope,
  findCollectionRecord,
  upsertRemoteRecord,
  waitForCollection,
} from "@/src/powersync/remote-sync";
import { fetchCurrentUserLocationScope } from "@/src/sync/current-user-location-scope";
import { createSyncProgressPublisher } from "@/src/sync/update-status";
import { getGraphQLErrorMessage } from "@/src/utils/graphql-errors";

const SYNC_KEY = "districts";

async function resolveRegionId(uuid: string) {
  const region = await findCollectionRecord(
    regionsCollection,
    (item) => item.uuid === uuid && !item.deletedAt,
  );
  if (region) return region.id;

  throw new Error(`Region with UUID ${uuid} is missing locally.`);
}

export async function syncDistricts(providedScope?: CurrentUserLocationScope) {
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

    for (const district of scope.districts) {
      const parentUuid = district.parent?.uuid;
      if (!parentUuid) continue;

      const regionId = await resolveRegionId(parentUuid);
      const timestamp = new Date().toISOString();
      await upsertRemoteRecord(districtsCollection, {
        id: district.id,
        legacyId: district.legacyId ?? null,
        reference: district.id,
        uuid: district.uuid,
        name: district.name?.trim() || "Unnamed district",
        code: district.code ?? null,
        regionId,
        synchronizedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
      syncedCount += 1;
      await publishProgress(null, syncedCount);
    }

    const districtUuids = new Set(scope.districtUuids);
    await deleteRemoteRecordsOutsideScope(districtsCollection, (district) =>
      district.uuid ? districtUuids.has(district.uuid) : false,
    );
    await publishProgress(null, syncedCount, { force: true, status: "completed" });
  } catch (error) {
    await publishProgress(null, syncedCount, {
      error: getGraphQLErrorMessage(error, "Districts sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}
