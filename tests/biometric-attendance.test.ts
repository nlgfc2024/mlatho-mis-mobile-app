// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPresentAttendeeVerified,
  attendanceRemarks,
  buildAttendanceAttendees,
  isVerificationForMember,
} from "../src/features/biometric-attendance/attendance-proof.ts";
import { biometricEnrollmentBlocker } from "../src/features/biometric-attendance/enrollment-availability.ts";

const household = {
  id: "household-row-1",
  uuid: "household-1",
  headName: "Head Name",
  representativeName: "Representative Name",
  groupCode: "HH-001",
};

const representative = {
  id: "member-row-1",
  uuid: "member-1",
  householdUuid: "household-1",
  fullName: "Representative Name",
  isRepresentative: 1,
  isHead: 0,
  isActive: 1,
  deletedAt: null,
};

function proof(memberId = "member-1") {
  return {
    version: 1,
    memberId,
    enrollmentId: "enrollment-1",
    method: "fingerprint",
    provider: "CertifiedProvider",
    verificationId: "verification-1",
    verifiedAt: "2026-07-22T10:00:00.000Z",
    offline: true,
  };
}

test("attendance selection resolves to the household's active representative", () => {
  const rows = buildAttendanceAttendees([household], [representative]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, household.id);
  assert.equal(rows[0].memberId, representative.uuid);
  assert.equal(rows[0].memberName, representative.fullName);
  assert.equal(rows[0].biometricVerification, null);
});

test("rejects a successful biometric proof belonging to another member", () => {
  const attendee = {
    ...household,
    memberId: "member-1",
    memberName: "Representative Name",
    status: "present",
    biometricVerification: proof("member-2"),
  };

  assert.equal(isVerificationForMember(attendee.memberId, attendee.biometricVerification), false);
  assert.throws(() => assertPresentAttendeeVerified(attendee), /selected member/i);
});

test("persists only the member-bound verification proof, never a biometric capture", () => {
  const attendee = {
    ...household,
    memberId: "member-1",
    memberName: "Representative Name",
    status: "present",
    biometricVerification: proof(),
  };

  assert.doesNotThrow(() => assertPresentAttendeeVerified(attendee));
  const remarks = attendanceRemarks(attendee);
  assert.ok(remarks);
  assert.deepEqual(JSON.parse(remarks).biometricVerification, proof());
  assert.equal(remarks.includes("templateReference"), false);
  assert.equal(remarks.includes("image"), false);
});

test("absent attendance does not require or store a biometric proof", () => {
  const attendee = {
    ...household,
    memberId: "member-1",
    memberName: "Representative Name",
    status: "absent",
    biometricVerification: null,
  };

  assert.doesNotThrow(() => assertPresentAttendeeVerified(attendee));
  assert.equal(attendanceRemarks(attendee), null);
});

const capabilities = {
  configured: true,
  provider: "OpenSourceProvider",
  methods: [
    { method: "fingerprint", available: true, canEnrollOffline: true, canVerifyOffline: true },
    { method: "face", available: true, canEnrollOffline: false, canVerifyOffline: true },
  ],
};

test("consented enrolment is available when the provider and method are available", () => {
  assert.equal(
    biometricEnrollmentBlocker({
      memberActive: true,
      capabilities,
      method: "fingerprint",
      isOnline: false,
    }),
    null,
  );
});

test("reports the native provider as the blocker instead of blaming consent", () => {
  assert.equal(
    biometricEnrollmentBlocker({
      memberActive: true,
      capabilities: { ...capabilities, configured: false, provider: null },
      method: "fingerprint",
      isOnline: true,
    }),
    "provider_unavailable",
  );
});

test("reports offline enrolment support independently from consent", () => {
  assert.equal(
    biometricEnrollmentBlocker({
      memberActive: true,
      capabilities,
      method: "face",
      isOnline: false,
    }),
    "offline_unavailable",
  );
});
