import { RowType, Schema, Table, column } from "@powersync/react-native";

const syncedTableOptions = {
  trackMetadata: true,
  trackPrevious: { onlyWhenChanged: true },
  ignoreEmptyUpdates: true,
} as const;

const localOnlyOptions = {
  localOnly: true,
} as const;

export const regions = new Table(
  {
    legacyId: column.integer,
    name: column.text,
    code: column.text,
    reference: column.text,
    uuid: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...syncedTableOptions, indexes: { reference: ["reference"], uuid: ["uuid"] } },
);

export const districts = new Table(
  {
    legacyId: column.integer,
    name: column.text,
    code: column.text,
    regionId: column.text,
    reference: column.text,
    uuid: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { region: ["regionId"], reference: ["reference"], uuid: ["uuid"] },
  },
);

export const wards = new Table(
  {
    legacyId: column.integer,
    name: column.text,
    code: column.text,
    districtId: column.text,
    reference: column.text,
    uuid: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { district: ["districtId"], reference: ["reference"], uuid: ["uuid"] },
  },
);

export const villages = new Table(
  {
    legacyId: column.integer,
    name: column.text,
    code: column.text,
    wardId: column.text,
    reference: column.text,
    uuid: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { ward: ["wardId"], reference: ["reference"], uuid: ["uuid"] },
  },
);

export const households = new Table(
  {
    headName: column.text,
    representativeName: column.text,
    groupCode: column.text,
    address: column.text,
    caseStatus: column.text,
    deactivationReason: column.text,
    deactivatedAt: column.text,
    villageId: column.text,
    uuid: column.text,
    reference: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { village: ["villageId"], reference: ["reference"], uuid: ["uuid"] },
  },
);

export const householdMembers = new Table(
  {
    uuid: column.text,
    householdUuid: column.text,
    fullName: column.text,
    middleName: column.text,
    dateOfBirth: column.text,
    gender: column.text,
    relationship: column.text,
    education: column.text,
    isDisabled: column.integer,
    disability: column.text,
    disabilityLevel: column.text,
    currentSchoolLevel: column.text,
    premNumber: column.text,
    avatarUri: column.text,
    identityType: column.text,
    identityNumber: column.text,
    identityScanUri: column.text,
    phoneNumber: column.text,
    isHead: column.integer,
    isRepresentative: column.integer,
    isActive: column.integer,
    deactivationReason: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { household: ["householdUuid"], active: ["isActive"] },
  },
);

export const targetedMembers = new Table(
  {
    reference: column.text,
    uuid: column.text,
    villageId: column.text,
    firstName: column.text,
    lastName: column.text,
    fullName: column.text,
    dateOfBirth: column.text,
    tf4No: column.text,
    interviewKey: column.text,
    locationJson: column.text,
    groupIdsJson: column.text,
    userUpdatedUsername: column.text,
    version: column.integer,
    isDeleted: column.integer,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: {
      reference: ["reference"],
      uuid: ["uuid"],
      village: ["villageId"],
      deleted: ["isDeleted"],
    },
  },
);

/**
 * Read-through cache for the Training GraphQL endpoint.
 *
 * This table is deliberately local-only: GraphQL refreshes replace the cache,
 * and cached training rows must never enter PowerSync's CRUD upload queue.
 */
export const trainings = new Table(
  {
    title: column.text,
    description: column.text,
    venue: column.text,
    code: column.text,
    status: column.text,
    paaReference: column.text,
    categoryId: column.text,
    categoryName: column.text,
    levelId: column.text,
    levelName: column.text,
    locationId: column.text,
    locationName: column.text,
    startDatetime: column.text,
    endDatetime: column.text,
    dateCreated: column.text,
    synchronizedAt: column.text,
  },
  {
    ...localOnlyOptions,
    indexes: {
      status: ["status"],
      category: ["categoryId"],
      level: ["levelId"],
      location: ["locationId"],
      startDatetime: ["startDatetime"],
    },
  },
);

export const paymentAccounts = new Table(
  {
    uuid: column.text,
    houseHoldId: column.text,
    accountProvider: column.text,
    accountNumber: column.text,
    accountName: column.text,
    isActive: column.integer,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { household: ["houseHoldId"], active: ["isActive"] },
  },
);

export const householdPaymentHistory = new Table(
  {
    uuid: column.text,
    householdUuid: column.text,
    transactionReference: column.text,
    amount: column.real,
    paymentWindow: column.text,
    paymentWindowStart: column.text,
    paymentWindowEnd: column.text,
    paidAt: column.text,
    status: column.text,
    provider: column.text,
    paymentPhoneNumber: column.text,
    registeredPaymentName: column.text,
    recipientName: column.text,
    paymentChannel: column.text,
    failureReason: column.text,
    reversalStatus: column.text,
    reversalReference: column.text,
    processingDate: column.text,
    lastStatusUpdate: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: {
      household: ["householdUuid"],
      paymentWindow: ["paymentWindow"],
      status: ["status"],
      provider: ["provider"],
      paymentPhoneNumber: ["paymentPhoneNumber"],
      transactionReference: ["transactionReference"],
    },
  },
);

export const householdChangeRequests = new Table(
  {
    householdUuid: column.text,
    memberUuid: column.text,
    type: column.text,
    payload: column.text,
    status: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { household: ["householdUuid"], member: ["memberUuid"], status: ["status"] },
  },
);

export const dataUpdateRequests = new Table(
  {
    householdUuid: column.text,
    memberUuid: column.text,
    targetTable: column.text,
    targetRecordId: column.text,
    module: column.text,
    type: column.text,
    status: column.text,
    priority: column.text,
    reason: column.text,
    remarks: column.text,
    previousPayload: column.text,
    proposedPayload: column.text,
    reviewPayload: column.text,
    requestedByUserId: column.text,
    reviewedByUserId: column.text,
    reviewedAt: column.text,
    clientMutationId: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: {
      household: ["householdUuid"],
      member: ["memberUuid"],
      target: ["targetTable", "targetRecordId"],
      module: ["module"],
      type: ["type"],
      status: ["status"],
      clientMutation: ["clientMutationId"],
      createdAt: ["createdAt"],
    },
  },
);

export const grievances = new Table(
  {
    title: column.text,
    category: column.text,
    type: column.text,
    description: column.text,
    incidentDate: column.text,
    paymentWindowPeriod: column.text,
    paymentWindowYear: column.integer,
    priority: column.text,
    flag: column.text,
    channel: column.text,
    resolution: column.text,
    status: column.text,
    eventLocationId: column.text,
    regionId: column.text,
    districtId: column.text,
    wardId: column.text,
    villageId: column.text,
    reporterName: column.text,
    reporterPhone: column.text,
    reporterId: column.text,
    reporterType: column.text,
    attendingStaffId: column.text,
    userId: column.text,
    clientMutationId: column.text,
    clientMutationLabel: column.text,
    consentGiven: column.integer,
    internalId: column.text,
    comments: column.text,
    evidenceImages: column.text,
    evidenceVideos: column.text,
    evidenceAudios: column.text,
    evidenceUploadedAt: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: {
      status: ["status"],
      village: ["villageId"],
      reporter: ["reporterId"],
      clientMutation: ["clientMutationId"],
      createdAt: ["createdAt"],
    },
  },
);

export const grievanceCategories = new Table(
  {
    name: column.text,
    timeline: column.real,
    isActive: column.integer,
    isDeleted: column.integer,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...syncedTableOptions, indexes: { name: ["name"], active: ["isActive"] } },
);

export const grievanceTypes = new Table(
  {
    name: column.text,
    categoryId: column.text,
    isActive: column.integer,
    isDeleted: column.integer,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { category: ["categoryId"], name: ["name"], active: ["isActive"] },
  },
);

export const grievanceChannels = new Table(
  {
    name: column.text,
    isActive: column.integer,
    isDeleted: column.integer,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...syncedTableOptions, indexes: { name: ["name"], active: ["isActive"] } },
);

export const attendanceSessions = new Table(
  {
    date: column.text,
    type: column.text,
    status: column.text,
    notes: column.text,
    villageId: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...syncedTableOptions, indexes: { village: ["villageId"], status: ["status"] } },
);

export const householdAttendance = new Table(
  {
    status: column.text,
    remarks: column.text,
    sessionId: column.text,
    householdId: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { session: ["sessionId"], household: ["householdId"] },
  },
);

export const pwpSessions = new Table(
  {
    date: column.text,
    status: column.text,
    notes: column.text,
    villageId: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...syncedTableOptions, indexes: { village: ["villageId"], status: ["status"] } },
);

export const pwpAttendance = new Table(
  {
    status: column.text,
    remarks: column.text,
    sessionId: column.text,
    householdId: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { session: ["sessionId"], household: ["householdId"] },
  },
);

export const attachments = new Table(
  {
    ownerTable: column.text,
    ownerId: column.text,
    kind: column.text,
    uri: column.text,
    mimeType: column.text,
    remoteUrl: column.text,
    status: column.text,
    uploadError: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  {
    ...syncedTableOptions,
    indexes: { owner: ["ownerTable", "ownerId"], status: ["status"] },
  },
);

export const users = new Table(
  {
    uuid: column.text,
    username: column.text,
    phone: column.text,
    email: column.text,
    firstName: column.text,
    lastName: column.text,
    authToken: column.text,
    lastLogin: column.text,
    language: column.text,
    isLoggedIn: column.integer,
    hasLocation: column.integer,
    regionId: column.text,
    districtId: column.text,
    wardId: column.text,
    villageId: column.text,
    reference: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...localOnlyOptions, indexes: { reference: ["reference"], loggedIn: ["isLoggedIn"] } },
);

export const userLocations = new Table(
  {
    regionId: column.text,
    districtId: column.text,
    wardId: column.text,
    villageId: column.text,
    userId: column.text,
    synchronizedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...localOnlyOptions, indexes: { user: ["userId"], village: ["villageId"] } },
);

export const syncMetadata = new Table(
  {
    key: column.text,
    module: column.text,
    locationId: column.text,
    userId: column.text,
    value: column.text,
    status: column.text,
    syncedCount: column.integer,
    cursor: column.text,
    error: column.text,
    pendingUploadCount: column.integer,
    conflictCount: column.integer,
    lastSyncedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text,
  },
  { ...localOnlyOptions, indexes: { key: ["key"], module: ["module"], location: ["locationId"] } },
);

export const syncConflicts = new Table(
  {
    tableName: column.text,
    recordId: column.text,
    operation: column.text,
    status: column.text,
    reason: column.text,
    strategy: column.text,
    localPayload: column.text,
    remotePayload: column.text,
    resolutionPayload: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    resolvedAt: column.text,
  },
  {
    ...localOnlyOptions,
    indexes: { record: ["tableName", "recordId"], status: ["status"] },
  },
);

/**
 * Opaque member-biometric template references kept only on this device.
 *
 * The PowerSync database is SQLCipher-encrypted and this table is local-only,
 * so neither raw captures nor vendor template handles enter the CRUD upload
 * queue. A replacement enrolment revokes the previous row instead of
 * overwriting it, preserving a local consent/revocation audit trail.
 */
export const biometricEnrollments = new Table(
  {
    memberId: column.text,
    householdId: column.text,
    method: column.text,
    provider: column.text,
    templateReference: column.text,
    templateVersion: column.integer,
    status: column.text,
    consentVersion: column.text,
    consentGivenAt: column.text,
    consentWithdrawnAt: column.text,
    enrolledByUserId: column.text,
    enrolledAt: column.text,
    lastVerifiedAt: column.text,
    revokedAt: column.text,
    createdAt: column.text,
    updatedAt: column.text,
  },
  {
    ...localOnlyOptions,
    indexes: {
      member: ["memberId"],
      memberMethod: ["memberId", "method"],
      status: ["status"],
    },
  },
);

export const lists = new Table(
  {
    name: column.text,
    owner_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { ...localOnlyOptions, indexes: { owner: ["owner_id"] } },
);

export const todos = new Table(
  {
    list_id: column.text,
    title: column.text,
    completed: column.integer,
    owner_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { ...localOnlyOptions, indexes: { list: ["list_id"] } },
);

export const AppSchema = new Schema({
  regions,
  districts,
  wards,
  villages,
  households,
  householdMembers,
  targetedMembers,
  trainings,
  paymentAccounts,
  householdPaymentHistory,
  householdChangeRequests,
  dataUpdateRequests,
  grievances,
  grievanceCategories,
  grievanceTypes,
  grievanceChannels,
  attendanceSessions,
  householdAttendance,
  pwpSessions,
  pwpAttendance,
  attachments,
  users,
  userLocations,
  syncMetadata,
  syncConflicts,
  biometricEnrollments,
  lists,
  todos,
});

export type PowerSyncDatabaseTypes = (typeof AppSchema)["types"];
export type RegionRecord = RowType<typeof regions>;
export type DistrictRecord = RowType<typeof districts>;
export type WardRecord = RowType<typeof wards>;
export type VillageRecord = RowType<typeof villages>;
export type HouseholdRecord = RowType<typeof households>;
export type HouseholdMemberRecord = RowType<typeof householdMembers>;
export type TargetedMemberRecord = RowType<typeof targetedMembers>;
export type TrainingRecord = RowType<typeof trainings>;
export type PaymentAccountRecord = RowType<typeof paymentAccounts>;
export type HouseholdPaymentHistoryRecord = RowType<typeof householdPaymentHistory>;
export type HouseholdChangeRequestRecord = RowType<typeof householdChangeRequests>;
export type DataUpdateRequestRecord = RowType<typeof dataUpdateRequests>;
export type GrievanceRecord = RowType<typeof grievances>;
export type GrievanceCategoryRecord = RowType<typeof grievanceCategories>;
export type GrievanceTypeRecord = RowType<typeof grievanceTypes>;
export type GrievanceChannelRecord = RowType<typeof grievanceChannels>;
export type AttendanceSessionRecord = RowType<typeof attendanceSessions>;
export type HouseholdAttendanceRecord = RowType<typeof householdAttendance>;
export type PwpSessionRecord = RowType<typeof pwpSessions>;
export type PwpAttendanceRecord = RowType<typeof pwpAttendance>;
export type AttachmentRecord = RowType<typeof attachments>;
export type UserRecord = RowType<typeof users>;
export type UserLocationRecord = RowType<typeof userLocations>;
export type SyncMetadataRecord = RowType<typeof syncMetadata>;
export type SyncConflictRecord = RowType<typeof syncConflicts>;
export type BiometricEnrollmentRecord = RowType<typeof biometricEnrollments>;
export type ListRecord = RowType<typeof lists>;
export type TodoRecord = RowType<typeof todos>;
