// Relative import (not the "@/" alias) so the node test runner can resolve it.
import { normalizeEvidenceList } from "../lib/grievance-evidence.ts";

export const PENDING_GRIEVANCE_STATUS = "Pending";
export const SYNCED_GRIEVANCE_STATUS = "Synchronized";
export const DEFAULT_GRIEVANCE_FLAGS = "Investigation";
export const DEFAULT_GRIEVANCE_CHANNEL = "Web";
export const DEFAULT_GRIEVANCE_PRIORITY = "Low";
export const DEFAULT_GRIEVANCE_CONSENT_GIVEN = true;
export const MIN_GRIEVANCE_DESCRIPTION_WORDS = 45;
export const MAX_GRIEVANCE_DESCRIPTION_WORDS = 150;

const RAW_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export class GrievanceSyncValidationError extends Error {
  status = 422;
  code = "BAD_USER_INPUT";

  constructor(message: string) {
    super(message);
    this.name = "GrievanceSyncValidationError";
  }
}

export type GrievanceSyncRecord = {
  id: string;
  title?: unknown;
  category?: unknown;
  type?: unknown;
  description?: unknown;
  incidentDate?: unknown;
  dateOfIncident?: unknown;
  priority?: unknown;
  flag?: unknown;
  flags?: unknown;
  channel?: unknown;
  resolution?: unknown;
  eventLocationId?: unknown;
  regionId?: unknown;
  districtId?: unknown;
  wardId?: unknown;
  villageId?: unknown;
  reporterId?: unknown;
  reporterType?: unknown;
  attendingStaffId?: unknown;
  userId?: unknown;
  clientMutationId?: unknown;
  clientMutationLabel?: unknown;
  consentGiven?: unknown;
  internalId?: unknown;
  comments?: unknown;
  evidenceImages?: unknown;
  evidenceVideos?: unknown;
  evidenceAudios?: unknown;
  evidenceUploadedAt?: unknown;
  synchronizedAt?: unknown;
  status?: unknown;
  updatedAt?: unknown;
};

export type GrievanceBackendComment = {
  id: string;
  comment: string;
  isResolution: boolean;
  commenter: string | null;
  commenterTypeName: string | null;
  commenterFirstName: string | null;
  commenterLastName: string | null;
  dateCreated: string | null;
  dateUpdated: string | null;
};

export type GrievanceBackendTicket = {
  id?: string | null;
  clientMutationId?: string | null;
  status?: string | null;
  resolution?: string | null;
  dateUpdated?: string | null;
  comments?: (Partial<GrievanceBackendComment> | null)[] | null;
};

export type GrievanceBackendUpdate = {
  internalId: string | null;
  clientMutationId: string | null;
  status: string;
  resolution: string | null;
  comments: string;
  synchronizedAt: string;
  updatedAt: string;
};

export type CreateGrievanceTicketVariables = {
  clientMutationId: string;
  clientMutationLabel: string;
  category: string;
  title: string;
  attendingStaffId: string;
  description: string;
  priority: string;
  dateOfIncident: string;
  channel: string;
  flags: string;
  consentGiven: boolean;
  regionId: number | null;
  districtId: number | null;
  wardId: number | null;
  villageId: number | null;
  eventLocationId: number | null;
};

export type CreateGrievanceTicketPayload = {
  internalId?: string | null;
  clientMutationId?: string | null;
};

export type CreateGrievanceTicketResponse = {
  createTicket?: CreateGrievanceTicketPayload | null;
};

export type HouseholdMemberReporterCandidate = {
  uuid?: string | null;
  id?: string | null;
  householdUuid?: string | null;
  isRepresentative?: number | boolean | null;
  isHead?: number | boolean | null;
  isActive?: number | boolean | null;
  deletedAt?: string | null;
};

function toText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return null;
}

export function isRawUuid(value: unknown) {
  return typeof value === "string" && RAW_UUID_PATTERN.test(value.trim());
}

function decodeBase64Ascii(value: string) {
  const input = value.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  if (!input || !/^[A-Za-z0-9+/]+$/.test(input) || input.length % 4 === 1) return null;

  let buffer = 0;
  let bits = 0;
  let output = "";

  for (const char of input) {
    const index = BASE64_CHARS.indexOf(char);
    if (index === -1) return null;

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

export function relayNodeValue(value: unknown) {
  const text = toText(value);
  if (!text) return null;

  const decoded = decodeBase64Ascii(text);
  const separatorIndex = decoded?.lastIndexOf(":") ?? -1;
  if (separatorIndex === -1) return null;

  return decoded?.slice(separatorIndex + 1).trim() || null;
}

export function rawUuidFromValue(value: unknown) {
  const text = toText(value);
  if (text && isRawUuid(text)) return text;

  const relayValue = relayNodeValue(text);
  return relayValue && isRawUuid(relayValue) ? relayValue : null;
}

export function firstRawUuid(...values: unknown[]) {
  for (const value of values) {
    const uuid = rawUuidFromValue(value);
    if (uuid) return uuid;
  }
  return null;
}

export function formatGrievanceClientMutationId(uuid: string) {
  return uuid;
}

function toDateOnly(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const text = toText(value);
  if (!text) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = relayNodeValue(value) ?? value.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function requireText(value: string | null, field: string) {
  if (!value) {
    throw new GrievanceSyncValidationError(`${field} is required before syncing a grievance.`);
  }
  return value;
}

function requireDescription(value: string | null) {
  const description = requireText(value, "description");
  const wordCount = grievanceDescriptionWordCount(description);
  if (wordCount < MIN_GRIEVANCE_DESCRIPTION_WORDS || wordCount > MAX_GRIEVANCE_DESCRIPTION_WORDS) {
    throw new GrievanceSyncValidationError(
      `description must contain between ${MIN_GRIEVANCE_DESCRIPTION_WORDS} and ${MAX_GRIEVANCE_DESCRIPTION_WORDS} words before syncing a grievance.`,
    );
  }
  return description;
}

export function grievanceDescriptionWordCount(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function requireRawUuid(value: string | null, field: string) {
  requireText(value, field);
  const uuid = rawUuidFromValue(value);
  if (!uuid) {
    throw new GrievanceSyncValidationError(`${field} must be a raw UUID.`);
  }
  return uuid;
}

type GrievanceUploadState = Pick<GrievanceSyncRecord, "status" | "internalId" | "synchronizedAt">;

export function shouldSkipGrievanceUpload(record: GrievanceUploadState | Record<string, unknown>) {
  return (
    firstText(record.status)?.toLowerCase() === SYNCED_GRIEVANCE_STATUS.toLowerCase() ||
    Boolean(firstText(record.internalId)) ||
    Boolean(firstText(record.synchronizedAt))
  );
}

export function needsGrievanceUpload(record: GrievanceUploadState | Record<string, unknown>) {
  return (
    firstText(record.status)?.toLowerCase() === PENDING_GRIEVANCE_STATUS.toLowerCase() &&
    !shouldSkipGrievanceUpload(record)
  );
}

export function normalizeGrievanceBackendStatus(value: unknown) {
  const status = toText(value);
  if (!status) return SYNCED_GRIEVANCE_STATUS;

  return status
    .toLowerCase()
    .split(/[_\s-]+/u)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function normalizeBackendComment(
  value: Partial<GrievanceBackendComment> | null,
  index: number,
): GrievanceBackendComment | null {
  const comment = toText(value?.comment);
  if (!comment) return null;

  return {
    id: toText(value?.id) ?? `backend-comment-${index}`,
    comment,
    isResolution: Boolean(value?.isResolution),
    commenter: toText(value?.commenter),
    commenterTypeName: toText(value?.commenterTypeName),
    commenterFirstName: toText(value?.commenterFirstName),
    commenterLastName: toText(value?.commenterLastName),
    dateCreated: toText(value?.dateCreated),
    dateUpdated: toText(value?.dateUpdated),
  };
}

export function parseGrievanceComments(value: unknown): GrievanceBackendComment[] {
  if (!value) return [];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((comment, index) => normalizeBackendComment(comment, index))
      .filter((comment): comment is GrievanceBackendComment => Boolean(comment));
  } catch {
    return [];
  }
}

export function buildGrievanceBackendUpdate(
  ticket: GrievanceBackendTicket,
  synchronizedAt = new Date().toISOString(),
): GrievanceBackendUpdate {
  const comments = (ticket.comments ?? [])
    .map((comment, index) => normalizeBackendComment(comment, index))
    .filter((comment): comment is GrievanceBackendComment => Boolean(comment));

  return {
    internalId: toText(ticket.id),
    clientMutationId: toText(ticket.clientMutationId),
    status: normalizeGrievanceBackendStatus(ticket.status),
    resolution: toText(ticket.resolution),
    comments: JSON.stringify(comments),
    synchronizedAt,
    updatedAt: toText(ticket.dateUpdated) ?? synchronizedAt,
  };
}

export async function syncGrievanceBackendUpdateQueue(options: {
  records: GrievanceSyncRecord[];
  fetchTicket: (locator: {
    internalId: string | null;
    clientMutationId: string | null;
  }) => Promise<GrievanceBackendTicket | null>;
  applyUpdate: (record: GrievanceSyncRecord, update: GrievanceBackendUpdate) => Promise<void>;
  now?: () => Date;
}) {
  const synchronizedRecords = options.records.filter(
    (record) =>
      !needsGrievanceUpload(record) &&
      Boolean(firstText(record.internalId, record.clientMutationId)),
  );
  let updated = 0;

  for (const record of synchronizedRecords) {
    const ticket = await options.fetchTicket({
      internalId: firstText(record.internalId),
      clientMutationId: firstText(record.clientMutationId),
    });
    if (!ticket) continue;

    await options.applyUpdate(
      record,
      buildGrievanceBackendUpdate(ticket, (options.now?.() ?? new Date()).toISOString()),
    );
    updated += 1;
  }

  return { attempted: synchronizedRecords.length, updated };
}

export function buildCreateGrievanceTicketVariables(
  record: GrievanceSyncRecord,
): CreateGrievanceTicketVariables {
  const title = requireText(firstText(record.title, record.type, record.category), "title");
  const category = requireText(firstText(record.category), "category");
  const description = requireDescription(firstText(record.description));
  const dateOfIncident = requireText(
    toDateOnly(firstText(record.dateOfIncident, record.incidentDate)),
    "dateOfIncident",
  );
  const clientMutationId = requireText(
    firstText(record.clientMutationId, record.id),
    "clientMutationId",
  );

  return {
    clientMutationId,
    clientMutationLabel: firstText(record.clientMutationLabel) ?? `Created Ticket ${title}`,
    category,
    title,
    attendingStaffId: requireRawUuid(
      firstText(record.attendingStaffId, record.userId),
      "attendingStaffId",
    ),
    description,
    priority: firstText(record.priority) ?? DEFAULT_GRIEVANCE_PRIORITY,
    dateOfIncident,
    channel: firstText(record.channel) ?? DEFAULT_GRIEVANCE_CHANNEL,
    flags: firstText(record.flags, record.flag) ?? DEFAULT_GRIEVANCE_FLAGS,
    consentGiven: toBoolean(record.consentGiven, DEFAULT_GRIEVANCE_CONSENT_GIVEN),
    regionId: toOptionalNumber(record.regionId),
    districtId: toOptionalNumber(record.districtId),
    wardId: toOptionalNumber(record.wardId),
    villageId: toOptionalNumber(record.villageId),
    eventLocationId: toOptionalNumber(record.eventLocationId ?? record.villageId),
  };
}

export function getCreateTicketPayload(
  response: CreateGrievanceTicketResponse,
): CreateGrievanceTicketPayload & { internalId: string } {
  const payload = response.createTicket;
  const internalId = payload?.internalId;
  if (!internalId) {
    throw new GrievanceSyncValidationError(
      "createTicket did not return an internalId for the grievance.",
    );
  }
  return { ...payload, internalId };
}

export async function syncGrievanceTicket(options: {
  record: GrievanceSyncRecord;
  createTicket: (
    variables: CreateGrievanceTicketVariables,
  ) => Promise<CreateGrievanceTicketResponse>;
  markSynced: (payload: {
    internalId: string;
    clientMutationId: string;
    synchronizedAt: string;
  }) => Promise<void>;
  now?: () => Date;
}) {
  const variables = buildCreateGrievanceTicketVariables(options.record);
  const response = await options.createTicket(variables);
  const payload = getCreateTicketPayload(response);

  if (payload.clientMutationId && payload.clientMutationId !== variables.clientMutationId) {
    throw new GrievanceSyncValidationError(
      "createTicket returned a different clientMutationId for the grievance.",
    );
  }

  const synchronizedAt = (options.now?.() ?? new Date()).toISOString();
  await options.markSynced({
    internalId: payload.internalId,
    clientMutationId: variables.clientMutationId,
    synchronizedAt,
  });

  return {
    ...payload,
    clientMutationId: variables.clientMutationId,
    synchronizedAt,
  };
}

export async function syncGrievanceTicketQueue(options: {
  records: GrievanceSyncRecord[];
  createTicket: (
    variables: CreateGrievanceTicketVariables,
  ) => Promise<CreateGrievanceTicketResponse>;
  markSynced: (
    record: GrievanceSyncRecord,
    payload: { internalId: string; clientMutationId: string; synchronizedAt: string },
  ) => Promise<void>;
  now?: () => Date;
}) {
  const pendingRecords = options.records.filter((record) => needsGrievanceUpload(record));
  let synchronized = 0;

  for (const record of pendingRecords) {
    await syncGrievanceTicket({
      record,
      createTicket: options.createTicket,
      markSynced: (payload) => options.markSynced(record, payload),
      now: options.now,
    });
    synchronized += 1;
  }

  return { attempted: pendingRecords.length, synchronized };
}

/**
 * Attachment upload rules mirror the backend's REST endpoint
 * (`grievance_social_protection/upload`): at most 5 active attachments per
 * ticket and a declared-MIME allowlist. Files outside the allowlist are
 * dropped client-side instead of burning an upload attempt the server would
 * reject.
 */
export const MAX_GRIEVANCE_ATTACHMENTS = 5;

export const GRIEVANCE_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const ATTACHMENT_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export type GrievanceAttachmentFile = {
  uri: string;
  name: string;
  type: string;
};

function attachmentFileName(uri: string, fileName?: string | null) {
  const explicit = toText(fileName);
  if (explicit) return explicit.replace(/[/\\]/g, "_");

  const lastSegment = uri.split("/").pop() ?? "";
  const withoutQuery = lastSegment.split("?")[0];
  return withoutQuery || "attachment";
}

function attachmentMimeType(name: string, mimeType?: string | null) {
  const declared = toText(mimeType)?.toLowerCase();
  if (declared) return declared;

  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return ATTACHMENT_MIME_BY_EXTENSION[extension] ?? null;
}

/**
 * Collect the locally stored evidence assets of a grievance as multipart-ready
 * files: allowed MIME types only, capped at the server's per-ticket limit.
 */
export function collectGrievanceAttachmentFiles(
  record: Pick<GrievanceSyncRecord, "evidenceImages" | "evidenceVideos" | "evidenceAudios">,
): GrievanceAttachmentFile[] {
  const assets = [
    ...normalizeEvidenceList(record.evidenceImages),
    ...normalizeEvidenceList(record.evidenceVideos),
    ...normalizeEvidenceList(record.evidenceAudios),
  ];

  const files: GrievanceAttachmentFile[] = [];
  for (const asset of assets) {
    if (files.length >= MAX_GRIEVANCE_ATTACHMENTS) break;

    const name = attachmentFileName(asset.uri, asset.fileName);
    const type = attachmentMimeType(name, asset.mimeType);
    if (!type || !GRIEVANCE_ATTACHMENT_MIME_TYPES.has(type)) continue;

    files.push({ uri: asset.uri, name, type });
  }

  return files;
}

/**
 * A grievance needs its attachments uploaded when the ticket itself is on the
 * server, it has uploadable evidence, and no successful upload was recorded.
 */
export function needsGrievanceAttachmentUpload(
  record: GrievanceSyncRecord | Record<string, unknown>,
) {
  return (
    shouldSkipGrievanceUpload(record) &&
    Boolean(firstText(record.internalId, record.clientMutationId)) &&
    !firstText(record.evidenceUploadedAt) &&
    collectGrievanceAttachmentFiles(record).length > 0
  );
}

export type GrievanceAttachmentUploadResult = {
  saved: { id?: string | null; filename?: string | null; mime_type?: string | null }[];
  errors: { filename?: string | null; error?: string | null }[];
};

export async function syncGrievanceAttachmentQueue(options: {
  records: GrievanceSyncRecord[];
  listRemoteFilenames: (locator: {
    internalId: string | null;
    clientMutationId: string | null;
  }) => Promise<string[] | null>;
  uploadAttachments: (
    locator: { internalId: string | null; clientMutationId: string | null },
    files: GrievanceAttachmentFile[],
  ) => Promise<GrievanceAttachmentUploadResult>;
  markUploaded: (record: GrievanceSyncRecord, uploadedAt: string) => Promise<void>;
  now?: () => Date;
}) {
  const pendingRecords = options.records.filter((record) => needsGrievanceAttachmentUpload(record));
  let uploaded = 0;

  for (const record of pendingRecords) {
    const locator = {
      internalId: firstText(record.internalId),
      clientMutationId: firstText(record.clientMutationId),
    };

    // The upload endpoint has no idempotency key, so a blind retry after a
    // partial failure would duplicate files that did reach the server. Skip
    // anything the server already has (matched by filename).
    const remoteFilenames = await options.listRemoteFilenames(locator);
    const alreadyUploaded = new Set(remoteFilenames ?? []);
    const files = collectGrievanceAttachmentFiles(record).filter(
      (file) => !alreadyUploaded.has(file.name),
    );

    const uploadedAt = (options.now?.() ?? new Date()).toISOString();
    if (files.length === 0) {
      await options.markUploaded(record, uploadedAt);
      uploaded += 1;
      continue;
    }

    const result = await options.uploadAttachments(locator, files);
    if (result.errors.length > 0) {
      // Leave the record unmarked so the failed files are retried on the next
      // sync pass; the successfully saved ones are excluded by the filename
      // check above.
      console.warn(
        "[Grievance Sync] Some attachments failed to upload:",
        result.errors.map((error) => `${error.filename}: ${error.error}`).join("; "),
      );
      continue;
    }

    await options.markUploaded(record, uploadedAt);
    uploaded += 1;
  }

  return { attempted: pendingRecords.length, uploaded };
}

function activeCandidate(member: HouseholdMemberReporterCandidate) {
  return !member.deletedAt && member.isActive !== 0 && member.isActive !== false;
}

function candidateUuid(member: HouseholdMemberReporterCandidate) {
  return firstRawUuid(member.uuid, member.id);
}

export function resolveReporterIdFromHouseholdMembers(
  members: HouseholdMemberReporterCandidate[],
  householdUuid?: string | null,
) {
  const scopedMembers = members.filter((member) => {
    if (!activeCandidate(member)) return false;
    if (!householdUuid) return true;
    return member.householdUuid === householdUuid;
  });

  const representative = scopedMembers.find(
    (member) => member.isRepresentative === 1 || member.isRepresentative === true,
  );
  const head = scopedMembers.find((member) => member.isHead === 1 || member.isHead === true);

  return candidateUuid(representative ?? head ?? scopedMembers[0] ?? {});
}
