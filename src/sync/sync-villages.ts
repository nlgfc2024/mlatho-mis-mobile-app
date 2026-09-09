import type { PageInfo } from "@/src/graphql/graphql";
import type { CurrentUserLocationScope } from "@/src/sync/current-user-location-scope";
import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";
import {
  syncMetadataCollection,
  villagesCollection,
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

interface Village {
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
    edges: ({ node?: Village | null } | null)[];
  } | null;
}

const PAGE_SIZE = 100;
const SYNC_KEY = "villages";

const GET_VILLAGES = gql`
  query GetVillagesSync($after: String, $first: Int!, $districtUuids: [String]!) {
    locations(
      type: "V"
      parent_Parent_Uuid_In: $districtUuids
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

async function resolveWardId(uuid: string) {
  const ward = await findCollectionRecord(
    wardsCollection,
    (item) => item.uuid === uuid && !item.deletedAt,
  );
  if (ward) return ward.id;

  throw new Error(`Ward with UUID ${uuid} is missing locally.`);
}

export async function syncVillages(providedScope?: CurrentUserLocationScope) {
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
      const response = await graphqlClient.request<GraphQlResponse>(GET_VILLAGES, {
        after: endCursor,
        first: PAGE_SIZE,
        districtUuids: scope.districtUuids,
      });

      if (!response?.locations?.pageInfo) {
        throw new Error("Invalid villages response from the server.");
      }

      for (const edge of response.locations.edges ?? []) {
        const node = edge?.node;
        const parentUuid = node?.parent?.uuid;

        if (!node?.id || !node.uuid || !parentUuid) continue;

        const wardId = await resolveWardId(parentUuid);
        const timestamp = new Date().toISOString();

        await upsertRemoteRecord(villagesCollection, {
          id: node.id,
          legacyId: node.legacyId ?? null,
          reference: node.id,
          uuid: node.uuid,
          name: node.name?.trim() || "Unnamed village",
          code: node.code ?? null,
          wardId,
          synchronizedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
        });
        syncedCount += 1;
        await publishProgress(endCursor, syncedCount);
      }

      hasNextPage = response.locations.pageInfo.hasNextPage;
      endCursor = nextPageCursor(response.locations.pageInfo, endCursor, "Villages");

      await publishProgress(endCursor, syncedCount, { force: true });
    }

    await waitForCollection(wardsCollection);
    const districtIds = new Set(scope.districts.map((district) => district.id));
    const inScopeWardIds = new Set(
      (await wardsCollection.toArrayWhenReady())
        .filter(
          (ward) => !ward.deletedAt && Boolean(ward.districtId && districtIds.has(ward.districtId)),
        )
        .map((ward) => ward.id),
    );
    await deleteRemoteRecordsOutsideScope(villagesCollection, (village) =>
      village.wardId ? inScopeWardIds.has(village.wardId) : false,
    );
    await publishProgress(null, syncedCount, { force: true, status: "completed" });
  } catch (error) {
    await publishProgress(endCursor, syncedCount, {
      error: getGraphQLErrorMessage(error, "Villages sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}
