import { randomUUID } from "expo-crypto";

import { biometricEnrollmentsCollection } from "@/src/powersync/collections";
import { waitForCollection } from "@/src/powersync/remote-sync";

import {
  captureMemberBiometric,
  getMemberBiometricCapabilities,
  matchMemberBiometric,
} from "./provider";
import {
  BIOMETRIC_CONSENT_VERSION,
  MemberBiometricError,
  type AttendanceVerificationProof,
  type MemberBiometricMethod,
} from "./types";

async function activeEnrollment(memberId: string, method: MemberBiometricMethod) {
  await waitForCollection(biometricEnrollmentsCollection);
  const rows = await biometricEnrollmentsCollection.toArrayWhenReady();
  return (
    rows
      .filter(
        (row) => row.memberId === memberId && row.method === method && row.status === "active",
      )
      .sort((a, b) => (b.enrolledAt ?? "").localeCompare(a.enrolledAt ?? ""))[0] ?? null
  );
}

export async function enrollMemberBiometric(input: {
  memberId: string;
  householdId: string | null;
  method: MemberBiometricMethod;
  authorizedByUserId: string;
  consentGranted: boolean;
  isOnline: boolean;
}) {
  if (!input.authorizedByUserId) {
    throw new MemberBiometricError("authorization_required", "An authorized user is required.");
  }
  if (!input.consentGranted) {
    throw new MemberBiometricError("consent_required", "Biometric consent is required.");
  }

  const capabilities = await getMemberBiometricCapabilities();
  const capability = capabilities.methods.find((item) => item.method === input.method);
  if (!capabilities.configured || !capabilities.provider) {
    throw new MemberBiometricError(
      "provider_unavailable",
      "A certified member-biometric provider is not installed on this build.",
    );
  }
  if (!capability?.available) {
    throw new MemberBiometricError("method_unavailable", "This biometric method is unavailable.");
  }
  if (!input.isOnline && !capability.canEnrollOffline) {
    throw new MemberBiometricError(
      "offline_unavailable",
      "This provider requires connectivity to enrol this biometric.",
    );
  }

  const result = await captureMemberBiometric({
    memberId: input.memberId,
    method: input.method,
    challenge: randomUUID(),
    consentVersion: BIOMETRIC_CONSENT_VERSION,
  });
  const now = result.capturedAt ?? new Date().toISOString();

  await waitForCollection(biometricEnrollmentsCollection);
  const existing = await biometricEnrollmentsCollection.toArrayWhenReady();
  for (const row of existing) {
    if (row.memberId !== input.memberId || row.method !== input.method || row.status !== "active") {
      continue;
    }
    const revokeTx = biometricEnrollmentsCollection.update(row.id, (draft) => {
      draft.status = "replaced";
      draft.revokedAt = now;
      draft.updatedAt = now;
    });
    await revokeTx.isPersisted.promise;
  }

  const enrollmentId = randomUUID();
  const tx = biometricEnrollmentsCollection.insert({
    id: enrollmentId,
    memberId: input.memberId,
    householdId: input.householdId,
    method: input.method,
    provider: result.provider,
    templateReference: result.templateReference,
    templateVersion: result.templateVersion ?? 1,
    status: "active",
    consentVersion: BIOMETRIC_CONSENT_VERSION,
    consentGivenAt: now,
    consentWithdrawnAt: null,
    enrolledByUserId: input.authorizedByUserId,
    enrolledAt: now,
    lastVerifiedAt: null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await tx.isPersisted.promise;

  return { enrollmentId, method: input.method, provider: result.provider, enrolledAt: now };
}

export async function revokeMemberBiometric(input: {
  enrollmentId: string;
  memberId: string;
  authorizedByUserId: string;
}) {
  if (!input.authorizedByUserId) {
    throw new MemberBiometricError("authorization_required", "An authorized user is required.");
  }

  const row = biometricEnrollmentsCollection.get(input.enrollmentId);
  if (!row || row.memberId !== input.memberId || row.status !== "active") return;

  const now = new Date().toISOString();
  const tx = biometricEnrollmentsCollection.update(row.id, (draft) => {
    draft.status = "revoked";
    draft.consentWithdrawnAt = now;
    draft.revokedAt = now;
    draft.updatedAt = now;
  });
  await tx.isPersisted.promise;
}

export async function verifyMemberForAttendance(input: {
  memberId: string;
  method: MemberBiometricMethod;
  isOnline: boolean;
}): Promise<AttendanceVerificationProof> {
  const enrollment = await activeEnrollment(input.memberId, input.method);
  if (!enrollment?.templateReference || !enrollment.provider) {
    throw new MemberBiometricError(
      "not_enrolled",
      "The selected member has no active enrolment for this method.",
    );
  }

  const capabilities = await getMemberBiometricCapabilities();
  const capability = capabilities.methods.find((item) => item.method === input.method);
  if (!capabilities.configured || capabilities.provider !== enrollment.provider) {
    throw new MemberBiometricError(
      "provider_unavailable",
      "The provider used for this member's enrolment is unavailable.",
    );
  }
  if (!capability?.available) {
    throw new MemberBiometricError("method_unavailable", "This biometric method is unavailable.");
  }
  if (!input.isOnline && !capability.canVerifyOffline) {
    throw new MemberBiometricError(
      "offline_unavailable",
      "This biometric method cannot verify attendance offline.",
    );
  }

  const result = await matchMemberBiometric({
    memberId: input.memberId,
    method: input.method,
    templateReference: enrollment.templateReference,
    challenge: randomUUID(),
  });
  if (result.memberId !== input.memberId || result.provider !== enrollment.provider) {
    throw new MemberBiometricError(
      "identity_mismatch",
      "The biometric matched a different member or enrolment provider.",
    );
  }

  const verifiedAt = result.verifiedAt ?? new Date().toISOString();
  const updateTx = biometricEnrollmentsCollection.update(enrollment.id, (draft) => {
    draft.lastVerifiedAt = verifiedAt;
    draft.updatedAt = verifiedAt;
  });
  await updateTx.isPersisted.promise;

  return {
    version: 1,
    memberId: input.memberId,
    enrollmentId: enrollment.id,
    method: input.method,
    provider: enrollment.provider,
    verificationId: result.verificationId,
    verifiedAt,
    offline: result.offline ?? !input.isOnline,
  };
}
