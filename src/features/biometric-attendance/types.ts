import type { HouseholdRecord } from "@/src/powersync/schema";

export const BIOMETRIC_CONSENT_VERSION = "2026-07";

export type MemberBiometricMethod = "fingerprint" | "face";

export type MemberBiometricCapability = {
  method: MemberBiometricMethod;
  available: boolean;
  canEnrollOffline: boolean;
  canVerifyOffline: boolean;
};

export type MemberBiometricCapabilities = {
  configured: boolean;
  provider: string | null;
  methods: MemberBiometricCapability[];
};

export type AttendanceVerificationProof = {
  version: 1;
  memberId: string;
  enrollmentId: string;
  method: MemberBiometricMethod;
  provider: string;
  verificationId: string;
  verifiedAt: string;
  offline: boolean;
};

export type AttendanceAttendee = Partial<HouseholdRecord> & {
  id: string;
  status: "present" | "absent" | null;
  memberId: string | null;
  memberName: string | null;
  biometricVerification: AttendanceVerificationProof | null;
};

export class MemberBiometricError extends Error {
  constructor(
    public readonly code:
      | "provider_unavailable"
      | "method_unavailable"
      | "not_enrolled"
      | "consent_required"
      | "authorization_required"
      | "identity_mismatch"
      | "offline_unavailable"
      | "cancelled"
      | "capture_failed"
      | "verification_failed",
    message: string,
  ) {
    super(message);
    this.name = "MemberBiometricError";
  }
}
