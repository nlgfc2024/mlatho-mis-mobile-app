import { requireOptionalNativeModule } from "expo-modules-core";

import {
  MemberBiometricError,
  type MemberBiometricCapabilities,
  type MemberBiometricMethod,
} from "./types";

type NativeEnrollmentResult = {
  memberId: string;
  method: MemberBiometricMethod;
  provider: string;
  templateReference: string;
  templateVersion?: number;
  capturedAt?: string;
};

type NativeVerificationResult = {
  success: boolean;
  memberId?: string;
  method?: MemberBiometricMethod;
  provider?: string;
  verificationId?: string;
  verifiedAt?: string;
  offline?: boolean;
  errorCode?: string;
};

type NativeMemberBiometricsModule = {
  getCapabilities(): Promise<MemberBiometricCapabilities>;
  enroll(input: {
    memberId: string;
    method: MemberBiometricMethod;
    challenge: string;
    consentVersion: string;
  }): Promise<NativeEnrollmentResult>;
  verify(input: {
    memberId: string;
    method: MemberBiometricMethod;
    templateReference: string;
    challenge: string;
  }): Promise<NativeVerificationResult>;
};

/**
 * Contract for a certified, member-aware biometric SDK or external scanner.
 * Captures and templates remain inside native/vendor code; JavaScript receives
 * only opaque references and signed/attested match results.
 *
 * Expo LocalAuthentication is intentionally not used here: it can authenticate
 * a device owner, but cannot identify which TASAF member supplied a biometric.
 */
const nativeProvider =
  requireOptionalNativeModule<NativeMemberBiometricsModule>("TasafMemberBiometrics");

const unavailableCapabilities: MemberBiometricCapabilities = {
  configured: false,
  provider: null,
  methods: [
    { method: "fingerprint", available: false, canEnrollOffline: false, canVerifyOffline: false },
    { method: "face", available: false, canEnrollOffline: false, canVerifyOffline: false },
  ],
};

function providerUnavailable() {
  return new MemberBiometricError(
    "provider_unavailable",
    "A certified member-biometric provider is not installed on this build.",
  );
}

export async function getMemberBiometricCapabilities(): Promise<MemberBiometricCapabilities> {
  if (!nativeProvider) return unavailableCapabilities;

  try {
    const capabilities = await nativeProvider.getCapabilities();
    if (!capabilities?.configured || !capabilities.provider) return unavailableCapabilities;
    return capabilities;
  } catch {
    return unavailableCapabilities;
  }
}

export async function captureMemberBiometric(input: {
  memberId: string;
  method: MemberBiometricMethod;
  challenge: string;
  consentVersion: string;
}) {
  if (!nativeProvider) throw providerUnavailable();

  const result = await nativeProvider.enroll(input);
  if (
    !result?.templateReference ||
    !result.provider ||
    result.memberId !== input.memberId ||
    result.method !== input.method
  ) {
    throw new MemberBiometricError(
      "identity_mismatch",
      "The enrolment result was not bound to the selected member.",
    );
  }

  return result;
}

export async function matchMemberBiometric(input: {
  memberId: string;
  method: MemberBiometricMethod;
  templateReference: string;
  challenge: string;
}) {
  if (!nativeProvider) throw providerUnavailable();

  const result = await nativeProvider.verify(input);
  if (!result?.success) {
    const code = result?.errorCode === "cancelled" ? "cancelled" : "verification_failed";
    throw new MemberBiometricError(code, "The biometric did not match the selected member.");
  }

  if (
    result.memberId !== input.memberId ||
    result.method !== input.method ||
    !result.provider ||
    !result.verificationId
  ) {
    throw new MemberBiometricError(
      "identity_mismatch",
      "The biometric match was returned for a different member.",
    );
  }

  return result as Required<
    Pick<
      NativeVerificationResult,
      "memberId" | "method" | "provider" | "verificationId" | "success"
    >
  > &
    NativeVerificationResult;
}
