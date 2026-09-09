import type { PageInfo } from "@/src/graphql/graphql";
import type { CurrentUserLocationScope } from "@/src/sync/current-user-location-scope";
import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";
import {
  districtsCollection,
  syncMetadataCollection,
  wardsCollection,
} from "@/src/powersync/collections";
import {
  deleteRemoteRecordsOutsideScope,
  findCollectionRecord,
  upsertRemoteRecord,
  waitForCollection,
} from "@/src/powersync/remote-sync";
import { fetchCurrentUserLocationScope } from "@/src/sync/current-user-location-scope";
import { nextPageCursor } from "@/src/sync/graphql-pagination";
import { createSyncProgressPublisher } from "@/src/sync/update-status";
import { getGraphQLErrorMessage } from "@/src/utils/graphql-errors";

interface Ward {
  id: string;
  legacyId?: number | null;
  uuid: string;
  name?: string | null;
  code?: string | null;
  parent?: { id?: string | null; uuid?: string | null } | null;
}

interface GraphQlResponse {
  locations?: {
    pageInfo: PageInfo;
    edges: ({ node?: Ward | null } | null)[];
  } | null;
}

const PAGE_SIZE = 100;
const SYNC_KEY = "wards";

const GET_WARDS = gql`
  query GetWardsSync($after: String, $first: Int!, $districtUuids: [String]!) {
    locations(
      type: "W"
      parent_Uuid_In: $districtUuids
      orderBy: ["uuid"]
      after: $after
      first: $first
    ) {
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          id
          legacyId
          uuid
          name
          code
          parent {
            id
            uuid
          }
        }
      }
    }
  }
`;

async function resolveDistrictId(uuid: string) {
  const district = await findCollectionRecord(
    districtsCollection,
    (item) => item.uuid === uuid && !item.deletedAt,
  );
  if (district) return district.id;

  throw new Error(`District with UUID ${uuid} is missing locally.`);
}

export async function syncWards(providedScope?: CurrentUserLocationScope) {
  const scope = providedScope ?? (await fetchCurrentUserLocationScope());
  let endCursor: string | null = null;
  let syncedCount = 0;
  const publishProgress = createSyncProgressPublisher(SYNC_KEY, {
    module: "location-hierarchy",
    locationId: scope.scopeKey,
    userId: scope.userId,
  });

  try {
    await waitForCollection(syncMetadataCollection);
    const metadata = syncMetadataCollection.get(SYNC_KEY);
    const canResume =
      metadata?.userId === scope.userId &&
      metadata.locationId === scope.scopeKey &&
      Boolean(metadata.cursor);
    endCursor = canResume ? (metadata?.cursor ?? null) : null;
    syncedCount = canResume ? (metadata?.syncedCount ?? 0) : 0;

    await publishProgress(endCursor, syncedCount, { force: true });

    let hasNextPage = scope.districtUuids.length > 0;

    while (hasNextPage) {
      const response = await graphqlClient.request<GraphQlResponse>(GET_WARDS, {
        after: endCursor,
        first: PAGE_SIZE,
        districtUuids: scope.districtUuids,
      });

      if (!response?.locations?.pageInfo) {
        throw new Error("Invalid wards response from the server.");
      }

      for (const edge of response.locations.edges ?? []) {
        const node = edge?.node;
        const parentUuid = node?.parent?.uuid;

        if (!node?.id || !node.uuid || !parentUuid) continue;

        const districtId = await resolveDistrictId(parentUuid);
        const timestamp = new Date().toISOString();

        await upsertRemoteRecord(wardsCollection, {
          id: node.id,
          legacyId: node.legacyId ?? null,
          reference: node.id,
          uuid: node.uuid,
          name: node.name?.trim() || "Unnamed ward",
          code: node.code ?? null,
          districtId,
          synchronizedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
        });
        syncedCount += 1;
        await publishProgress(endCursor, syncedCount);
      }

      hasNextPage = response.locations.pageInfo.hasNextPage;
      endCursor = nextPageCursor(response.locations.pageInfo, endCursor, "Wards");

      await publishProgress(endCursor, syncedCount, { force: true });
    }

    const districtIds = new Set(scope.districts.map((district) => district.id));
    await deleteRemoteRecordsOutsideScope(wardsCollection, (ward) =>
      ward.districtId ? districtIds.has(ward.districtId) : false,
    );
    await publishProgress(null, syncedCount, { force: true, status: "completed" });
  } catch (error) {
    await publishProgress(endCursor, syncedCount, {
      error: getGraphQLErrorMessage(error, "Wards sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}
