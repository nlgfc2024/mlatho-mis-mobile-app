import { randomUUID } from "expo-crypto";

import {
  attendanceSessionsCollection,
  grievancesCollection,
  householdChangeRequestsCollection,
  paymentAccountsCollection,
  pwpSessionsCollection,
} from "./collections";
import {
  DEFAULT_GRIEVANCE_CHANNEL,
  DEFAULT_GRIEVANCE_CONSENT_GIVEN,
  DEFAULT_GRIEVANCE_FLAGS,
  DEFAULT_GRIEVANCE_PRIORITY,
  PENDING_GRIEVANCE_STATUS,
  buildCreateGrievanceTicketVariables,
  formatGrievanceClientMutationId,
} from "./grievance-sync";

type MutationIntent =
  | "offline-create"
  | "offline-update"
  | "offline-delete"
  | "server-resolution"
  | "manual-resolution";

type MutationMetadata = {
  intent: MutationIntent;
  conflictStrategy: "last-write-wins" | "server-wins" | "client-wins" | "manual" | "field-merge";
  createdAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function nullableText(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : String(value);
}

function metadata(
  intent: MutationIntent,
  conflictStrategy: MutationMetadata["conflictStrategy"] = "manual",
): MutationMetadata {
  return {
    intent,
    conflictStrategy,
    createdAt: nowIso(),
  };
}

export type CreateLocalGrievanceInput = {
  title?: string | null;
  category?: string | null;
  type?: string | null;
  description?: string | null;
  incidentDate?: string | null;
  paymentWindowPeriod?: string | null;
  paymentWindowYear?: number | null;
  priority?: string | null;
  flag?: string | null;
  channel?: string | null;
  resolution?: string | null;
  eventLocationId?: string | number | null;
  regionId?: string | number | null;
  districtId?: string | number | null;
  wardId?: string | number | null;
  villageId?: string | number | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  reporterId?: string | null;
  reporterType?: string | null;
  attendingStaffId?: string | null;
  userId?: string | null;
  clientMutationId?: string | null;
  clientMutationLabel?: string | null;
  consentGiven?: boolean | null;
  evidenceImages?: unknown[];
  evidenceVideos?: unknown[];
  evidenceAudios?: unknown[];
};

export function createLocalGrievance(input: CreateLocalGrievanceInput) {
  const createdAt = nowIso();
  const id = randomUUID();
  const clientMutationId = input.clientMutationId ?? formatGrievanceClientMutationId(randomUUID());
  const title = input.title ?? input.type ?? input.category ?? null;
  const record = {
    id,
    title,
    category: input.category ?? null,
    type: input.type ?? null,
    description: input.description ?? null,
    incidentDate: input.incidentDate ?? null,
    paymentWindowPeriod: input.paymentWindowPeriod ?? null,
    paymentWindowYear: input.paymentWindowYear ?? null,
    priority: input.priority ?? DEFAULT_GRIEVANCE_PRIORITY,
    flag: input.flag ?? DEFAULT_GRIEVANCE_FLAGS,
    channel: input.channel ?? DEFAULT_GRIEVANCE_CHANNEL,
    resolution: input.resolution ?? null,
    status: PENDING_GRIEVANCE_STATUS,
    eventLocationId: nullableText(input.eventLocationId),
    regionId: nullableText(input.regionId),
    districtId: nullableText(input.districtId),
    wardId: nullableText(input.wardId),
    villageId: nullableText(input.villageId),
    reporterName: input.reporterName ?? null,
    reporterPhone: input.reporterPhone ?? null,
    reporterId: input.reporterId ?? null,
    reporterType: input.reporterType ?? null,
    attendingStaffId: input.attendingStaffId ?? input.userId ?? null,
    userId: input.userId ?? null,
    clientMutationId,
    clientMutationLabel: input.clientMutationLabel ?? (title ? `Created Ticket ${title}` : null),
    consentGiven: (input.consentGiven ?? DEFAULT_GRIEVANCE_CONSENT_GIVEN) ? 1 : 0,
    internalId: null,
    comments: JSON.stringify([]),
    evidenceImages: JSON.stringify(input.evidenceImages ?? []),
    evidenceVideos: JSON.stringify(input.evidenceVideos ?? []),
    evidenceAudios: JSON.stringify(input.evidenceAudios ?? []),
    evidenceUploadedAt: null,
    synchronizedAt: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };

  buildCreateGrievanceTicketVariables(record);

  return grievancesCollection.insert(record, { metadata: metadata("offline-create", "manual") });
}

export type UpsertPaymentAccountInput = {
  id?: string;
  houseHoldId: string;
  accountProvider: string;
  accountNumber: string;
  accountName: string;
};

export function upsertPaymentAccount(input: UpsertPaymentAccountInput) {
  const updatedAt = nowIso();
  const id = input.id ?? randomUUID();

  if (paymentAccountsCollection.get(id)) {
    return paymentAccountsCollection.update(
      id,
      { metadata: metadata("offline-update", "manual") },
      (draft) => {
        draft.uuid = id;
        draft.houseHoldId = input.houseHoldId;
        draft.accountProvider = input.accountProvider;
        draft.accountNumber = input.accountNumber;
        draft.accountName = input.accountName;
        draft.isActive = 1;
        draft.synchronizedAt = null;
        draft.updatedAt = updatedAt;
      },
    );
  }

  return paymentAccountsCollection.insert(
    {
      id,
      uuid: id,
      houseHoldId: input.houseHoldId,
      accountProvider: input.accountProvider,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      isActive: 1,
      synchronizedAt: null,
      createdAt: updatedAt,
      updatedAt,
      deletedAt: null,
    },
    { metadata: metadata("offline-create", "manual") },
  );
}

export type HouseholdChangeType =
  | "household_details_update"
  | "household_address_change"
  | "household_deactivated"
  | "payment_phone_update_requested"
  | "payment_phone_updated"
  | "payment_follow_up_added"
  | "member_added"
  | "member_updated"
  | "member_deactivated";

export function enqueueHouseholdChangeRequest(input: {
  householdUuid: string;
  memberUuid?: string | null;
  type: HouseholdChangeType;
  payload: Record<string, unknown>;
}) {
  const createdAt = nowIso();

  return householdChangeRequestsCollection.insert(
    {
      id: randomUUID(),
      householdUuid: input.householdUuid,
      memberUuid: input.memberUuid ?? null,
      type: input.type,
      payload: JSON.stringify(input.payload),
      status: "Pending",
      synchronizedAt: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    },
    { metadata: metadata("offline-create", "manual") },
  );
}

export function createPwpSession(input: {
  date: string;
  notes?: string | null;
  villageId: string;
}) {
  const createdAt = nowIso();

  return pwpSessionsCollection.insert(
    {
      id: randomUUID(),
      date: input.date,
      status: "Pending",
      notes: input.notes ?? null,
      villageId: input.villageId,
      synchronizedAt: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    },
    { metadata: metadata("offline-create", "client-wins") },
  );
}

export function createAttendanceSession(input: {
  date: string;
  type?: string | null;
  notes?: string | null;
  villageId: string;
}) {
  const createdAt = nowIso();

  return attendanceSessionsCollection.insert(
    {
      id: randomUUID(),
      date: input.date,
      type: input.type ?? null,
      status: "Pending",
      notes: input.notes ?? null,
      villageId: input.villageId,
      synchronizedAt: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    },
    { metadata: metadata("offline-create", "client-wins") },
  );
}
