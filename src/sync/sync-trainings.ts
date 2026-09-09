import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";
import { trainingsCollection } from "@/src/powersync/collections";
import { deleteRemoteRecordsOutsideScope, upsertRemoteRecord } from "@/src/powersync/remote-sync";
import { createSyncProgressPublisher } from "@/src/sync/update-status";
import { getGraphQLErrorMessage } from "@/src/utils/graphql-errors";

type TrainingReferenceNode = {
  id?: string | null;
  name?: string | null;
};

type TrainingNode = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  venue?: string | null;
  code?: string | null;
  status?: string | null;
  paaReference?: string | null;
  category?: TrainingReferenceNode | null;
  level?: TrainingReferenceNode | null;
  location?: TrainingReferenceNode | null;
  startDatetime?: string | null;
  endDatetime?: string | null;
  dateCreated?: string | null;
};

type GetTrainingsResponse = {
  training?: {
    edges?: ({ node?: TrainingNode | null } | null)[] | null;
  } | null;
};

export const GET_TRAININGS = gql`
  query GetTrainings {
    training {
      edges {
        node {
          id
          title
          description
          venue
          code
          status
          paaReference
          category {
            id
            name
          }
          level {
            id
            name
          }
          location {
            id
            name
          }
          startDatetime
          endDatetime
          dateCreated
        }
      }
    }
  }
`;

const TRAININGS_SYNC_KEY = "trainings";

export async function syncTrainings() {
  let syncedCount = 0;
  const publishProgress = createSyncProgressPublisher(TRAININGS_SYNC_KEY, {
    module: "trainings",
  });

  try {
    await publishProgress(null, syncedCount, { force: true });

    const response = await graphqlClient.request<GetTrainingsResponse>(GET_TRAININGS);
    if (!response.training) {
      throw new Error("Invalid trainings response from the server.");
    }

    const synchronizedAt = new Date().toISOString();
    const syncedIds = new Set<string>();

    for (const edge of response.training.edges ?? []) {
      const node = edge?.node;
      if (!node?.id || syncedIds.has(node.id)) continue;

      syncedIds.add(node.id);
      await upsertRemoteRecord(trainingsCollection, {
        id: node.id,
        title: node.title?.trim() || "Untitled training",
        description: node.description?.trim() || "",
        venue: node.venue?.trim() || "",
        code: node.code?.trim() || "",
        status: node.status?.trim() || "",
        paaReference: node.paaReference?.trim() || "",
        categoryId: node.category?.id ?? null,
        categoryName: node.category?.name?.trim() || "",
        levelId: node.level?.id ?? null,
        levelName: node.level?.name?.trim() || "",
        locationId: node.location?.id ?? null,
        locationName: node.location?.name?.trim() || "",
        startDatetime: node.startDatetime ?? null,
        endDatetime: node.endDatetime ?? null,
        dateCreated: node.dateCreated ?? null,
        synchronizedAt,
      });

      syncedCount += 1;
      await publishProgress(null, syncedCount);
    }

    // The supplied query returns the complete training set, so records omitted
    // by a successful response are stale local cache entries.
    await deleteRemoteRecordsOutsideScope(trainingsCollection, (record) =>
      syncedIds.has(record.id),
    );

    await publishProgress(null, syncedCount, { force: true, status: "completed" });
    return syncedCount;
  } catch (error) {
    await publishProgress(null, syncedCount, {
      error: getGraphQLErrorMessage(error, "Trainings sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}
