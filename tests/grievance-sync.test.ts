// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateGrievanceTicketVariables,
  buildGrievanceBackendUpdate,
  collectGrievanceAttachmentFiles,
  firstRawUuid,
  formatGrievanceClientMutationId,
  needsGrievanceAttachmentUpload,
  needsGrievanceUpload,
  syncGrievanceAttachmentQueue,
  parseGrievanceComments,
  resolveReporterIdFromHouseholdMembers,
  shouldSkipGrievanceUpload,
  syncGrievanceBackendUpdateQueue,
  syncGrievanceTicket,
  syncGrievanceTicketQueue,
} from "../src/powersync/grievance-sync.ts";

const reporterId = "97ff2d55-7c45-405c-b0e2-4f5da75525f2";
const attendingStaffId = "bbc5cc86-1de6-416f-ae21-38b9b7bd656b";
const clientMutationId = "2fdc190c-fb5c-46d4-904b-5ed5dad00372";
const validDescription =
  "We and our vendors use cookies and similar technologies to enhance your experience, analyze site traffic, personalize content, and deliver targeted advertising. You can manage your preferences by selecting Accept all, Reject non-essential, or Manage preferences. For more details, please see our Cookie Notice and Privacy Notice.";

function relayId(type: string, value: string) {
  return Buffer.from(`${type}:${value}`).toString("base64");
}

function validRecord(overrides = {}) {
  return {
    id: "local-grievance-1",
    title: "Beneficiary did not receive payment",
    category: "Payment complaint",
    description: validDescription,
    reporterType: "individual",
    reporterId,
    attendingStaffId,
    incidentDate: "2026-06-16T12:00:00.000Z",
    priority: "Low",
    channel: "Web",
    flag: "Investigation",
    resolution: "5,0",
    eventLocationId: "123",
    regionId: "1",
    districtId: "2",
    wardId: "3",
    villageId: "123",
    clientMutationId,
    clientMutationLabel: "Created Ticket Beneficiary did not receive payment",
    consentGiven: true,
    status: "Pending",
    ...overrides,
  };
}

test("syncs a locally created grievance while online", async () => {
  let requestedVariables: any = null;
  let markedSynced: any = null;

  await syncGrievanceTicket({
    record: validRecord(),
    createTicket: async (variables) => {
      requestedVariables = variables;
      return { createTicket: { internalId: "GRV-2026-0001", clientMutationId } };
    },
    markSynced: async (payload) => {
      markedSynced = payload;
    },
    now: () => new Date("2026-06-16T10:00:00.000Z"),
  });

  assert.deepEqual(requestedVariables, {
    clientMutationId,
    clientMutationLabel: "Created Ticket Beneficiary did not receive payment",
    category: "Payment complaint",
    title: "Beneficiary did not receive payment",
    attendingStaffId,
    description: validDescription,
    priority: "Low",
    dateOfIncident: "2026-06-16",
    channel: "Web",
    flags: "Investigation",
    consentGiven: true,
    regionId: 1,
    districtId: 2,
    wardId: 3,
    villageId: 123,
    eventLocationId: 123,
  });
  assert.equal(markedSynced?.internalId, "GRV-2026-0001");
  assert.equal(markedSynced?.synchronizedAt, "2026-06-16T10:00:00.000Z");
});

test("keeps an offline grievance pending and syncs it later with the same clientMutationId", async () => {
  const record = validRecord();

  assert.equal(shouldSkipGrievanceUpload(record), false);
  assert.equal(buildCreateGrievanceTicketVariables(record).clientMutationId, clientMutationId);

  let calls = 0;
  await syncGrievanceTicket({
    record,
    createTicket: async (variables) => {
      calls += 1;
      assert.equal(variables.clientMutationId, clientMutationId);
      return { createTicket: { internalId: "GRV-2026-0002", clientMutationId } };
    },
    markSynced: async () => {},
  });

  assert.equal(calls, 1);
});

test("does not mark a failed sync and retries later without changing clientMutationId", async () => {
  const record = validRecord();
  const requestedIds: string[] = [];
  let markedCount = 0;

  await assert.rejects(
    syncGrievanceTicket({
      record,
      createTicket: async (variables) => {
        requestedIds.push(variables.clientMutationId);
        throw new Error("Network request failed");
      },
      markSynced: async () => {
        markedCount += 1;
      },
    }),
    /Network request failed/,
  );

  await syncGrievanceTicket({
    record,
    createTicket: async (variables) => {
      requestedIds.push(variables.clientMutationId);
      return { createTicket: { internalId: "GRV-2026-0003", clientMutationId } };
    },
    markSynced: async () => {
      markedCount += 1;
    },
  });

  assert.deepEqual(requestedIds, [clientMutationId, clientMutationId]);
  assert.equal(markedCount, 1);
});

test("prevents duplicate uploads once a grievance has been marked synced", () => {
  assert.equal(shouldSkipGrievanceUpload(validRecord({ internalId: "GRV-2026-0001" })), true);
  assert.equal(shouldSkipGrievanceUpload(validRecord({ synchronizedAt: "2026-06-16" })), true);
  assert.equal(shouldSkipGrievanceUpload(validRecord({ status: "Synchronized" })), true);
  assert.equal(needsGrievanceUpload(validRecord()), true);
  assert.equal(needsGrievanceUpload(validRecord({ internalId: "GRV-2026-0001" })), false);
  assert.equal(needsGrievanceUpload(validRecord({ synchronizedAt: "2026-06-16" })), false);
});

test("rejects missing required fields before syncing", () => {
  assert.throws(
    () => buildCreateGrievanceTicketVariables(validRecord({ category: "" })),
    /category is required/,
  );
});

test("accepts descriptions from 45 to 150 words and rejects values outside the range", () => {
  const words = (count: number) =>
    Array.from({ length: count }, (_, index) => `word${index}`).join(" ");

  assert.throws(
    () => buildCreateGrievanceTicketVariables(validRecord({ description: words(44) })),
    /between 45 and 150 words/,
  );
  assert.equal(
    buildCreateGrievanceTicketVariables(validRecord({ description: words(45) })).description,
    words(45),
  );
  assert.equal(
    buildCreateGrievanceTicketVariables(validRecord({ description: words(100) })).description,
    words(100),
  );
  assert.equal(
    buildCreateGrievanceTicketVariables(validRecord({ description: words(150) })).description,
    words(150),
  );
  assert.throws(
    () => buildCreateGrievanceTicketVariables(validRecord({ description: words(151) })),
    /between 45 and 150 words/,
  );
});

test("rejects invalid attending staff UUIDs", () => {
  assert.equal(firstRawUuid("VXNlckdRTFR5cGU6MQ==", attendingStaffId), attendingStaffId);
  assert.throws(
    () => buildCreateGrievanceTicketVariables(validRecord({ attendingStaffId: "not-a-uuid" })),
    /attendingStaffId must be a raw UUID/,
  );
});

test("decodes legacy Relay IDs before building createTicket variables", () => {
  const variables = buildCreateGrievanceTicketVariables(
    validRecord({
      attendingStaffId: null,
      userId: relayId("UserGQLType", attendingStaffId),
      eventLocationId: null,
      villageId: relayId("LocationGQLType", "59340"),
    }),
  );

  assert.equal(firstRawUuid(relayId("UserGQLType", attendingStaffId)), attendingStaffId);
  assert.equal(variables.attendingStaffId, attendingStaffId);
  assert.equal(variables.eventLocationId, 59340);
  assert.equal(variables.villageId, 59340);
});

test("builds numeric location fields for location-based grievance creation", () => {
  const variables = buildCreateGrievanceTicketVariables(validRecord());

  assert.equal(variables.eventLocationId, 123);
  assert.equal(variables.regionId, 1);
  assert.equal(variables.districtId, 2);
  assert.equal(variables.wardId, 3);
  assert.equal(variables.villageId, 123);
});

test("backfills label and consent for grievances queued before the new fields existed", () => {
  const variables = buildCreateGrievanceTicketVariables(
    validRecord({ clientMutationLabel: null, consentGiven: null }),
  );

  assert.equal(variables.clientMutationLabel, "Created Ticket Beneficiary did not receive payment");
  assert.equal(variables.consentGiven, true);
});

test("resolves a beneficiary reporter from household members", () => {
  const resolved = resolveReporterIdFromHouseholdMembers(
    [
      {
        uuid: "11111111-1111-4111-8111-111111111111",
        householdUuid: "household-1",
        isHead: 1,
        isRepresentative: 0,
        isActive: 1,
      },
      {
        uuid: reporterId,
        householdUuid: "household-1",
        isHead: 0,
        isRepresentative: 1,
        isActive: 1,
      },
    ],
    "household-1",
  );

  assert.equal(resolved, reporterId);
});

test("uses raw UUIDs as grievance clientMutationIds", () => {
  const first = formatGrievanceClientMutationId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  const second = formatGrievanceClientMutationId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

  assert.equal(first, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(second, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  assert.notEqual(first, second);
});

test("drains pending grievances and makes the pending banner predicate false", async () => {
  const pending = validRecord();
  const alreadySynced = validRecord({
    id: "already-synced",
    internalId: "GRV-OLD",
    status: "Synchronized",
  });
  const records = [pending, alreadySynced];
  let createCalls = 0;

  const result = await syncGrievanceTicketQueue({
    records,
    createTicket: async (variables) => {
      createCalls += 1;
      return {
        createTicket: {
          internalId: "GRV-2026-QUEUE",
          clientMutationId: variables.clientMutationId,
        },
      };
    },
    markSynced: async (record, payload) => {
      Object.assign(record, {
        internalId: payload.internalId,
        clientMutationId: payload.clientMutationId,
        synchronizedAt: payload.synchronizedAt,
        status: "Synchronized",
      });
    },
    now: () => new Date("2026-07-13T09:00:00.000Z"),
  });

  assert.deepEqual(result, { attempted: 1, synchronized: 1 });
  assert.equal(createCalls, 1);
  assert.equal(needsGrievanceUpload(pending), false);
  assert.equal(shouldSkipGrievanceUpload(pending), true);
});

test("normalizes backend status and comments for local grievance storage", () => {
  const update = buildGrievanceBackendUpdate(
    {
      id: "VGlja2V0R1FMVHlwZToxMjM=",
      clientMutationId,
      status: "IN_PROGRESS",
      resolution: "The case is being reviewed.",
      dateUpdated: "2026-07-13T11:45:00.000Z",
      comments: [
        {
          id: "comment-1",
          comment: "We have assigned this grievance to the district team.",
          isResolution: false,
          commenterTypeName: "Staff",
          commenterFirstName: "Asha",
          commenterLastName: "Juma",
          dateCreated: "2026-07-13T11:30:00.000Z",
        },
        { id: "empty-comment", comment: "   " },
      ],
    },
    "2026-07-13T12:00:00.000Z",
  );

  assert.equal(update.status, "In Progress");
  assert.equal(update.updatedAt, "2026-07-13T11:45:00.000Z");
  assert.equal(update.synchronizedAt, "2026-07-13T12:00:00.000Z");
  assert.deepEqual(parseGrievanceComments(update.comments), [
    {
      id: "comment-1",
      comment: "We have assigned this grievance to the district team.",
      isResolution: false,
      commenter: null,
      commenterTypeName: "Staff",
      commenterFirstName: "Asha",
      commenterLastName: "Juma",
      dateCreated: "2026-07-13T11:30:00.000Z",
      dateUpdated: null,
    },
  ]);
});

test("pulls backend changes only for grievances that are already synchronized", async () => {
  const pending = validRecord();
  const synchronized = validRecord({
    id: "synced-grievance",
    internalId: "VGlja2V0R1FMVHlwZToxMjM=",
    status: "Synchronized",
    synchronizedAt: "2026-07-13T09:00:00.000Z",
  });
  const fetchedIds: (string | null)[] = [];
  const applied: any[] = [];

  const result = await syncGrievanceBackendUpdateQueue({
    records: [pending, synchronized],
    fetchTicket: async (locator) => {
      fetchedIds.push(locator.internalId);
      return {
        id: locator.internalId,
        clientMutationId,
        status: "RESOLVED",
        comments: [{ id: "resolution-1", comment: "Payment was restored.", isResolution: true }],
      };
    },
    applyUpdate: async (record, update) => {
      applied.push({ record, update });
    },
    now: () => new Date("2026-07-13T12:00:00.000Z"),
  });

  assert.deepEqual(result, { attempted: 1, updated: 1 });
  assert.deepEqual(fetchedIds, ["VGlja2V0R1FMVHlwZToxMjM="]);
  assert.equal(applied[0].record.id, "synced-grievance");
  assert.equal(applied[0].update.status, "Resolved");
  assert.equal(parseGrievanceComments(applied[0].update.comments)[0].isResolution, true);
});

test("collects evidence assets as multipart files with inferred mime types", () => {
  const files = collectGrievanceAttachmentFiles({
    evidenceImages: JSON.stringify([
      { uri: "file:///evidence/photo one.jpg", fileName: "photo one.jpg" },
      { uri: "file:///evidence/scan.png", mimeType: "image/png" },
      { uri: "file:///evidence/notes.txt", fileName: "notes.txt" },
    ]),
    evidenceVideos: JSON.stringify([{ uri: "file:///evidence/clip.mp4" }]),
    evidenceAudios: JSON.stringify([{ uri: "file:///evidence/statement.m4a" }]),
  });

  assert.deepEqual(files, [
    { uri: "file:///evidence/photo one.jpg", name: "photo one.jpg", type: "image/jpeg" },
    { uri: "file:///evidence/scan.png", name: "scan.png", type: "image/png" },
    { uri: "file:///evidence/clip.mp4", name: "clip.mp4", type: "video/mp4" },
    { uri: "file:///evidence/statement.m4a", name: "statement.m4a", type: "audio/mpeg" },
  ]);
});

test("caps collected attachments at the server's five-file limit", () => {
  const files = collectGrievanceAttachmentFiles({
    evidenceImages: JSON.stringify(
      Array.from({ length: 7 }, (_, index) => ({ uri: `file:///evidence/photo-${index}.jpg` })),
    ),
  });

  assert.equal(files.length, 5);
});

test("flags attachment upload only for synchronized grievances with pending evidence", () => {
  const evidenceImages = JSON.stringify([{ uri: "file:///evidence/photo.jpg" }]);
  const synced = validRecord({
    internalId: "VGlja2V0R1FMVHlwZToxMjM=",
    status: "Synchronized",
    synchronizedAt: "2026-07-13T09:00:00.000Z",
    evidenceImages,
  });

  assert.equal(needsGrievanceAttachmentUpload(synced), true);
  assert.equal(needsGrievanceAttachmentUpload(validRecord({ evidenceImages })), false);
  assert.equal(
    needsGrievanceAttachmentUpload({ ...synced, evidenceUploadedAt: "2026-07-13T10:00:00.000Z" }),
    false,
  );
  assert.equal(needsGrievanceAttachmentUpload({ ...synced, evidenceImages: "[]" }), false);
});

test("uploads pending attachments, skips files already on the server, and marks success", async () => {
  const synced = validRecord({
    internalId: "VGlja2V0R1FMVHlwZToxMjM=",
    status: "Synchronized",
    synchronizedAt: "2026-07-13T09:00:00.000Z",
    evidenceImages: JSON.stringify([
      { uri: "file:///evidence/photo.jpg" },
      { uri: "file:///evidence/scan.png" },
    ]),
  });
  const uploadedBatches: any[] = [];
  const marked: any[] = [];

  const result = await syncGrievanceAttachmentQueue({
    records: [validRecord(), synced],
    listRemoteFilenames: async () => ["photo.jpg"],
    uploadAttachments: async (locator, files) => {
      uploadedBatches.push({ locator, files });
      return { saved: files.map((file) => ({ filename: file.name })), errors: [] };
    },
    markUploaded: async (record, uploadedAt) => {
      marked.push({ id: record.id, uploadedAt });
    },
    now: () => new Date("2026-07-13T12:00:00.000Z"),
  });

  assert.deepEqual(result, { attempted: 1, uploaded: 1 });
  assert.equal(uploadedBatches.length, 1);
  assert.deepEqual(uploadedBatches[0].locator, {
    internalId: "VGlja2V0R1FMVHlwZToxMjM=",
    clientMutationId,
  });
  assert.deepEqual(
    uploadedBatches[0].files.map((file: any) => file.name),
    ["scan.png"],
  );
  assert.deepEqual(marked, [{ id: "local-grievance-1", uploadedAt: "2026-07-13T12:00:00.000Z" }]);
});

test("leaves the grievance unmarked when some attachments fail to upload", async () => {
  const synced = validRecord({
    internalId: "VGlja2V0R1FMVHlwZToxMjM=",
    status: "Synchronized",
    synchronizedAt: "2026-07-13T09:00:00.000Z",
    evidenceImages: JSON.stringify([{ uri: "file:///evidence/photo.jpg" }]),
  });
  const marked: any[] = [];

  const result = await syncGrievanceAttachmentQueue({
    records: [synced],
    listRemoteFilenames: async () => null,
    uploadAttachments: async () => ({
      saved: [],
      errors: [{ filename: "photo.jpg", error: "mime type not allowed" }],
    }),
    markUploaded: async (record, uploadedAt) => {
      marked.push({ id: record.id, uploadedAt });
    },
  });

  assert.deepEqual(result, { attempted: 1, uploaded: 0 });
  assert.deepEqual(marked, []);
});
