import { gql } from "graphql-request";

import { PageInfo } from "@/src/graphql/graphql";
import { graphqlClient } from "@/src/lib/graphql-client";
import { getTargetedMembersSyncKey, ensureVillageScopedSyncMetadata } from "@/src/onboarding/state";
import { syncMetadataCollection, targetedMembersCollection } from "@/src/powersync/collections";
import { upsertRemoteRecord, waitForCollection } from "@/src/powersync/remote-sync";
import { createSyncProgressPublisher } from "@/src/sync/update-status";
import { getGraphQLErrorMessage } from "@/src/utils/graphql-errors";

type VillageLike = {
  id: number | string;
  uuid?: string | null;
  reference?: string | null;
};

type TargetedMemberLocation = {
  id: string;
  uuid?: string | null;
  code?: string | null;
  name?: string | null;
  type?: string | null;
  parent?: TargetedMemberLocation | null;
};

type TargetedMember = {
  id: string;
  uuid?: string | null;
  isDeleted?: boolean | null;
  dateCreated?: string | null;
  dateUpdated?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  jsonExt?: unknown;
  version?: number | null;
  tf4No?: string | null;
  interviewKey?: string | null;
  userUpdated?: { username?: string | null } | null;
  location?: TargetedMemberLocation | null;
  groupindividuals?: {
    edges: ({ node?: { group?: { id?: string | null } | null } | null } | null)[];
  } | null;
};

type GraphQlResponse = {
  individual?: {
    pageInfo: PageInfo;
    edges: ({ node?: TargetedMember | null } | null)[];
  } | null;
};

const PAGE_SIZE = 100;

const GET_TARGETED_MEMBERS_FOR_VILLAGE = gql`
  query GetTargetedMembersForVillage($after: String, $first: Int, $villageId: String) {
    individual(
      isDeleted: false
      parentLocation: $villageId
      parentLocationLevel: 3
      first: $first
      after: $after
      orderBy: ["lastName"]
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        node {
          id
          uuid
          isDeleted
          dateCreated
          dateUpdated
          firstName
          lastName
          dob
          jsonExt
          version
          tf4No
          interviewKey
          userUpdated {
            username
          }
          location {
            id
            uuid
            code
            name
            type
            parent {
              id
              uuid
              code
              name
              type
              parent {
                id
                uuid
                code
                name
                type
                parent {
                  id
                  uuid
                  code
                  name
                  type
                }
              }
            }
          }
          groupindividuals(isDeleted: false) {
            edges {
              node {
                group {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

function safeStringify(value: unknown) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function getGroupIds(member: TargetedMember) {
  const ids =
    member.groupindividuals?.edges
      .map((edge) => edge?.node?.group?.id)
      .filter((id): id is string => Boolean(id)) ?? [];

  return Array.from(new Set(ids));
}

export async function syncTargetedMembersForVillage(
  village: VillageLike,
  userReference?: number | string | null,
) {
  const syncKey = getTargetedMembersSyncKey(village.id, userReference);
  const villageUuid = village.uuid ?? village.reference;
  let endCursor: string | null = null;
  let syncedCount = 0;
  const progressOptions = {
    module: "targeted-members",
    locationId: String(village.id),
    userId: userReference ? String(userReference) : null,
  };
  const publishProgress = createSyncProgressPublisher(syncKey, progressOptions);

  if (!villageUuid) {
    throw new Error("Selected village is missing its remote UUID.");
  }

  try {
    await ensureVillageScopedSyncMetadata(village.id, userReference);
    await waitForCollection(syncMetadataCollection);

    const metadata = syncMetadataCollection.get(syncKey);
    endCursor = metadata?.cursor ?? null;
    syncedCount = metadata?.syncedCount ?? 0;
    await publishProgress(endCursor, syncedCount, { force: true });

    let hasNextPage = true;

    while (hasNextPage) {
      const response = await graphqlClient.request<GraphQlResponse>(
        GET_TARGETED_MEMBERS_FOR_VILLAGE,
        {
          after: endCursor,
          first: PAGE_SIZE,
          villageId: villageUuid,
        },
      );

      if (!response?.individual?.pageInfo) {
        throw new Error("Invalid targeted members response from the server.");
      }

      for (const edge of response.individual.edges ?? []) {
        const node = edge?.node;
        if (!node?.id) continue;

        const timestamp = new Date().toISOString();
        const fullName = [node.firstName, node.lastName]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(" ")
          .trim();

        await upsertRemoteRecord(targetedMembersCollection, {
          id: node.id,
          reference: node.id,
          uuid: node.uuid ?? null,
          villageId: String(village.id),
          firstName: node.firstName ?? null,
          lastName: node.lastName ?? null,
          fullName: fullName || "Unnamed targeted member",
          dateOfBirth: node.dob ?? null,
          tf4No: node.tf4No ?? null,
          interviewKey: node.interviewKey ?? null,
          locationJson: safeStringify(node.location),
          groupIdsJson: safeStringify(getGroupIds(node)),
          userUpdatedUsername: node.userUpdated?.username ?? null,
          version: node.version ?? null,
          isDeleted: node.isDeleted ? 1 : 0,
          synchronizedAt: timestamp,
          createdAt: node.dateCreated ?? timestamp,
          updatedAt: node.dateUpdated ?? timestamp,
          deletedAt: node.isDeleted ? timestamp : null,
        });
        syncedCount += 1;
        await publishProgress(endCursor, syncedCount);
      }

      hasNextPage = response.individual.pageInfo.hasNextPage;
      endCursor = response.individual.pageInfo.endCursor ?? null;

      await publishProgress(endCursor, syncedCount, { force: true });
    }

    await publishProgress(null, syncedCount, { force: true, status: "completed" });
  } catch (error) {
    await publishProgress(endCursor, syncedCount, {
      error: getGraphQLErrorMessage(error, "Targeted members sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}
