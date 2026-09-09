import type { MemberBiometricCapabilities, MemberBiometricMethod } from "./types";

export type BiometricEnrollmentBlocker =
  | "member_inactive"
  | "provider_unavailable"
  | "method_unavailable"
  | "offline_unavailable";

export function biometricEnrollmentBlocker(input: {
  memberActive: boolean;
  capabilities: MemberBiometricCapabilities;
  method: MemberBiometricMethod;
  isOnline: boolean;
}): BiometricEnrollmentBlocker | null {
  if (!input.memberActive) return "member_inactive";
  if (!input.capabilities.configured || !input.capabilities.provider) {
    return "provider_unavailable";
  }

  const capability = input.capabilities.methods.find((item) => item.method === input.method);
  if (!capability?.available) return "method_unavailable";
  if (!input.isOnline && !capability.canEnrollOffline) return "offline_unavailable";

  return null;
}
