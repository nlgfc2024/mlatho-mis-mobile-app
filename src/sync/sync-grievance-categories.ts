import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";
import {
  GRIEVANCE_CATEGORIES_SYNC_KEY,
  GRIEVANCE_CHANNELS_SYNC_KEY,
  GRIEVANCE_SETUP_SYNC_KEY,
  GRIEVANCE_TYPES_SYNC_KEY,
} from "@/src/onboarding/state";
import {
  grievanceCategoriesCollection,
  grievanceChannelsCollection,
  grievanceTypesCollection,
  syncMetadataCollection,
} from "@/src/powersync/collections";
import { upsertRemoteRecord, waitForCollection } from "@/src/powersync/remote-sync";
import { createSyncProgressPublisher, updateStatus } from "@/src/sync/update-status";
import { getGraphQLErrorMessage } from "@/src/utils/graphql-errors";

type GrievanceTypeNode = {
  id?: string | null;
  name?: string | null;
  isActive?: boolean | null;
};

type GrievanceCategoryNode = {
  id?: string | null;
  name?: string | null;
  timeline?: number | string | null;
  isActive?: boolean | null;
  types?: (GrievanceTypeNode | null)[] | null;
};

type GrievanceChannelNode = {
  id?: string | null;
  name?: string | null;
  isActive?: boolean | null;
};

type Edge<T> = { node?: T | null } | null;

type GrievanceCategoriesResponse = {
  grievanceCategories?: {
    edges?: Edge<GrievanceCategoryNode>[] | null;
  } | null;
};

type GrievanceTypesResponse = {
  grievanceTypes?: {
    edges?: Edge<GrievanceTypeNode>[] | null;
  } | null;
};

type GrievanceChannelsResponse = {
  grievanceChannels?: {
    edges?: Edge<GrievanceChannelNode>[] | null;
  } | null;
};

const GET_GRIEVANCE_CATEGORIES = gql`
  query GetGrievanceCategories {
    grievanceCategories {
      edges {
        node {
          id
          name
          timeline
          isActive
        }
      }
    }
  }
`;

// Categories with their nested types: the nested shape is the only source of
// the type -> category linkage, so the types step re-reads it.
const GET_GRIEVANCE_CATEGORY_TYPES = gql`
  query GetGrievanceCategoryTypes {
    grievanceCategories {
      edges {
        node {
          id
          types {
            id
            name
            isActive
          }
        }
      }
    }
  }
`;

const GET_GRIEVANCE_TYPES = gql`
  query GetGrievanceTypes {
    grievanceTypes {
      edges {
        node {
          id
          name
          isActive
        }
      }
    }
  }
`;

const GET_GRIEVANCE_CHANNELS = gql`
  query GetGrievanceChannels {
    grievanceChannels {
      edges {
        node {
          id
          name
          isActive
        }
      }
    }
  }
`;

function nowIso() {
  return new Date().toISOString();
}

function normalizeName(value: string | null | undefined, fallback: string) {
  const name = value?.trim();
  return name || fallback;
}

function activeFlag(value: boolean | null | undefined) {
  return value === false ? 0 : 1;
}

function toTimeline(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function upsertCategory(node: GrievanceCategoryNode) {
  if (!node.id) return;

  const timestamp = nowIso();
  const existing = grievanceCategoriesCollection.get(node.id);

  await upsertRemoteRecord(grievanceCategoriesCollection, {
    id: node.id,
    name: normalizeName(node.name, "Unnamed grievance category"),
    timeline: toTimeline(node.timeline),
    isActive: activeFlag(node.isActive),
    isDeleted: 0,
    synchronizedAt: timestamp,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  });
}

async function upsertType(node: GrievanceTypeNode, categoryId?: string | null) {
  if (!node.id) return;

  const timestamp = nowIso();
  const existing = grievanceTypesCollection.get(node.id);

  await upsertRemoteRecord(grievanceTypesCollection, {
    id: node.id,
    categoryId: categoryId ?? existing?.categoryId ?? null,
    name: normalizeName(node.name, "Unnamed grievance type"),
    isActive: activeFlag(node.isActive),
    isDeleted: 0,
    synchronizedAt: timestamp,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  });
}

async function upsertChannel(node: GrievanceChannelNode) {
  if (!node.id) return;

  const timestamp = nowIso();
  const existing = grievanceChannelsCollection.get(node.id);

  await upsertRemoteRecord(grievanceChannelsCollection, {
    id: node.id,
    name: normalizeName(node.name, "Unnamed grievance channel"),
    isActive: activeFlag(node.isActive),
    isDeleted: 0,
    synchronizedAt: timestamp,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  });
}

// Users who synced before the split have the legacy combined key completed;
// their data is already local, so each split step short-circuits to completed.
function isLegacySetupCompleted() {
  return syncMetadataCollection.get(GRIEVANCE_SETUP_SYNC_KEY)?.value === "completed";
}

type GrievanceSyncStep = {
  key: string;
  run: (trackSyncedRecord: (id: string) => Promise<void>) => Promise<void>;
};

async function runGrievanceSyncStep({ key, run }: GrievanceSyncStep) {
  let syncedCount = 0;
  const syncedRecordIds = new Set<string>();
  const publishProgress = createSyncProgressPublisher(key, {
    module: "grievances",
  });

  const trackSyncedRecord = async (id: string) => {
    if (syncedRecordIds.has(id)) return;
    syncedRecordIds.add(id);
    syncedCount += 1;
    await publishProgress(null, syncedCount);
  };

  try {
    await Promise.all([
      waitForCollection(syncMetadataCollection),
      waitForCollection(grievanceCategoriesCollection),
      waitForCollection(grievanceTypesCollection),
      waitForCollection(grievanceChannelsCollection),
    ]);

    if (syncMetadataCollection.get(key)?.value === "completed") return;

    if (isLegacySetupCompleted()) {
      await updateStatus(key, "completed", null, { module: "grievances", syncedCount: 0 });
      return;
    }

    await publishProgress(null, syncedCount, { force: true });

    await run(trackSyncedRecord);

    await publishProgress(null, syncedCount, { force: true, status: "completed" });
  } catch (error) {
    await publishProgress(null, syncedCount, {
      error: getGraphQLErrorMessage(error, "Grievance setup sync failed."),
      force: true,
      status: "error",
    });
    throw error;
  }
}

export async function syncGrievanceCategories() {
  await runGrievanceSyncStep({
    key: GRIEVANCE_CATEGORIES_SYNC_KEY,
    run: async (trackSyncedRecord) => {
      const response =
        await graphqlClient.request<GrievanceCategoriesResponse>(GET_GRIEVANCE_CATEGORIES);

      for (const edge of response.grievanceCategories?.edges ?? []) {
        const category = edge?.node;
        if (!category?.id) continue;

        await upsertCategory(category);
        await trackSyncedRecord(category.id);
      }
    },
  });
}

export async function syncGrievanceTypes() {
  await runGrievanceSyncStep({
    key: GRIEVANCE_TYPES_SYNC_KEY,
    run: async (trackSyncedRecord) => {
      const [categoryTypesResponse, typesResponse] = await Promise.all([
        graphqlClient.request<GrievanceCategoriesResponse>(GET_GRIEVANCE_CATEGORY_TYPES),
        graphqlClient.request<GrievanceTypesResponse>(GET_GRIEVANCE_TYPES),
      ]);

      for (const edge of categoryTypesResponse.grievanceCategories?.edges ?? []) {
        const category = edge?.node;
        if (!category?.id) continue;

        for (const type of category.types ?? []) {
          if (type?.id) {
            await upsertType(type, category.id);
            await trackSyncedRecord(type.id);
          }
        }
      }

      for (const edge of typesResponse.grievanceTypes?.edges ?? []) {
        const type = edge?.node;
        if (type?.id) {
          await upsertType(type);
          await trackSyncedRecord(type.id);
        }
      }
    },
  });
}

export async function syncGrievanceChannels() {
  await runGrievanceSyncStep({
    key: GRIEVANCE_CHANNELS_SYNC_KEY,
    run: async (trackSyncedRecord) => {
      const response =
        await graphqlClient.request<GrievanceChannelsResponse>(GET_GRIEVANCE_CHANNELS);

      for (const edge of response.grievanceChannels?.edges ?? []) {
        const channel = edge?.node;
        if (channel?.id) {
          await upsertChannel(channel);
          await trackSyncedRecord(channel.id);
        }
      }
    },
  });
}
