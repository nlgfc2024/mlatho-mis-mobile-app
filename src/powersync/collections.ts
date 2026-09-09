import { BasicIndex } from "@tanstack/db";
import { powerSyncCollectionOptions } from "@tanstack/powersync-db-collection";
import { createCollection } from "@tanstack/react-db";

import { createPowerSyncTableSchema, keepPowerSyncTableColumns } from "./collection-schema";
import { AppSchema } from "./schema";
import { db } from "./system";

const syncBatchSize = 1_000;
const eagerTableNames = new Set([
  AppSchema.props.regions.viewName,
  AppSchema.props.districts.viewName,
  AppSchema.props.wards.viewName,
  AppSchema.props.villages.viewName,
  AppSchema.props.grievanceCategories.viewName,
  AppSchema.props.grievanceTypes.viewName,
  AppSchema.props.grievanceChannels.viewName,
  AppSchema.props.trainings.viewName,
  AppSchema.props.users.viewName,
  AppSchema.props.userLocations.viewName,
  AppSchema.props.syncMetadata.viewName,
  AppSchema.props.syncConflicts.viewName,
]);

function powerSyncOptions<TTable extends (typeof AppSchema.props)[keyof typeof AppSchema.props]>(
  table: TTable,
) {
  const options = powerSyncCollectionOptions({
    database: db,
    table,
    schema: createPowerSyncTableSchema(table),
    syncBatchSize,
    // Live queries that combine orderBy with limit need a range-capable index
    // on their leading sort field to preserve PowerSync's lazy loading.
    autoIndex: "eager",
    defaultIndexType: BasicIndex,
    // Large operational tables are loaded by active live queries rather than
    // all at process start. Small startup/config tables stay eager.
    syncMode: eagerTableNames.has(table.viewName) ? "eager" : "on-demand",
    onDeserializationError: (error) => {
      db.logger.error(`Failed to deserialize ${table.viewName} PowerSync row`, error);
    },
  });
  const getMeta = options.utils.getMeta;

  // Rows loaded by older builds can still contain PowerSync's `_metadata` and
  // `_deleted` fields. The adapter rejects those fields when an existing row is
  // updated, so only pass the table's public columns to its SQLite serializer.
  return {
    ...options,
    utils: {
      ...options.utils,
      getMeta: () => {
        const meta = getMeta();

        return {
          ...meta,
          serializeValue: (value: Record<string, unknown>) =>
            meta.serializeValue(keepPowerSyncTableColumns(table, value)),
        };
      },
    },
  };
}

export const regionsCollection = createCollection(powerSyncOptions(AppSchema.props.regions));

export const districtsCollection = createCollection(powerSyncOptions(AppSchema.props.districts));

export const wardsCollection = createCollection(powerSyncOptions(AppSchema.props.wards));

export const villagesCollection = createCollection(powerSyncOptions(AppSchema.props.villages));

export const householdsCollection = createCollection(powerSyncOptions(AppSchema.props.households));

export const householdMembersCollection = createCollection(
  powerSyncOptions(AppSchema.props.householdMembers),
);

export const targetedMembersCollection = createCollection(
  powerSyncOptions(AppSchema.props.targetedMembers),
);

export const trainingsCollection = createCollection(powerSyncOptions(AppSchema.props.trainings));

export const paymentAccountsCollection = createCollection(
  powerSyncOptions(AppSchema.props.paymentAccounts),
);

export const householdPaymentHistoryCollection = createCollection(
  powerSyncOptions(AppSchema.props.householdPaymentHistory),
);

export const householdChangeRequestsCollection = createCollection(
  powerSyncOptions(AppSchema.props.householdChangeRequests),
);

export const dataUpdateRequestsCollection = createCollection(
  powerSyncOptions(AppSchema.props.dataUpdateRequests),
);

export const grievancesCollection = createCollection(powerSyncOptions(AppSchema.props.grievances));

export const grievanceCategoriesCollection = createCollection(
  powerSyncOptions(AppSchema.props.grievanceCategories),
);

export const grievanceTypesCollection = createCollection(
  powerSyncOptions(AppSchema.props.grievanceTypes),
);

export const grievanceChannelsCollection = createCollection(
  powerSyncOptions(AppSchema.props.grievanceChannels),
);

export const attendanceSessionsCollection = createCollection(
  powerSyncOptions(AppSchema.props.attendanceSessions),
);

export const householdAttendanceCollection = createCollection(
  powerSyncOptions(AppSchema.props.householdAttendance),
);

export const pwpSessionsCollection = createCollection(
  powerSyncOptions(AppSchema.props.pwpSessions),
);

export const pwpAttendanceCollection = createCollection(
  powerSyncOptions(AppSchema.props.pwpAttendance),
);

export const attachmentsCollection = createCollection(
  powerSyncOptions(AppSchema.props.attachments),
);

export const usersCollection = createCollection(powerSyncOptions(AppSchema.props.users));

export const userLocationsCollection = createCollection(
  powerSyncOptions(AppSchema.props.userLocations),
);

export const syncMetadataCollection = createCollection(
  powerSyncOptions(AppSchema.props.syncMetadata),
);

export const syncConflictsCollection = createCollection(
  powerSyncOptions(AppSchema.props.syncConflicts),
);

export const biometricEnrollmentsCollection = createCollection(
  powerSyncOptions(AppSchema.props.biometricEnrollments),
);

export const listsCollection = createCollection(powerSyncOptions(AppSchema.props.lists));

export const todosCollection = createCollection(powerSyncOptions(AppSchema.props.todos));

export const collections = {
  regions: regionsCollection,
  districts: districtsCollection,
  wards: wardsCollection,
  villages: villagesCollection,
  households: householdsCollection,
  householdMembers: householdMembersCollection,
  targetedMembers: targetedMembersCollection,
  trainings: trainingsCollection,
  paymentAccounts: paymentAccountsCollection,
  householdPaymentHistory: householdPaymentHistoryCollection,
  householdChangeRequests: householdChangeRequestsCollection,
  dataUpdateRequests: dataUpdateRequestsCollection,
  grievances: grievancesCollection,
  grievanceCategories: grievanceCategoriesCollection,
  grievanceTypes: grievanceTypesCollection,
  grievanceChannels: grievanceChannelsCollection,
  attendanceSessions: attendanceSessionsCollection,
  householdAttendance: householdAttendanceCollection,
  pwpSessions: pwpSessionsCollection,
  pwpAttendance: pwpAttendanceCollection,
  attachments: attachmentsCollection,
  users: usersCollection,
  userLocations: userLocationsCollection,
  syncMetadata: syncMetadataCollection,
  syncConflicts: syncConflictsCollection,
  biometricEnrollments: biometricEnrollmentsCollection,
  lists: listsCollection,
  todos: todosCollection,
} as const;

// TanStack DB joins (and the internal joins its live-query optimizer compiles)
// key on `id`. Without an index it logs "Join requires an index on 'id' ...
// Falling back to loading all data" and scans the whole collection, so we
// register an eager `id` index on every collection up front.
for (const collection of Object.values(collections)) {
  (
    collection as {
      createIndex(
        callback: (row: { id: unknown }) => unknown,
        config: { indexType: typeof BasicIndex },
      ): unknown;
    }
  ).createIndex((row) => row.id, { indexType: BasicIndex });
}
