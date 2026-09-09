import * as LocalAuthentication from "expo-local-authentication";

import i18n from "@/src/i18n";

type BiometricAvailability =
  | {
      available: true;
      label: string;
      supportedTypes: LocalAuthentication.AuthenticationType[];
    }
  | {
      available: false;
      message: string;
      supportedTypes: LocalAuthentication.AuthenticationType[];
    };

type AuthenticateBiometricOptions = {
  promptMessage: string;
  promptSubtitle?: string;
  promptDescription?: string;
};

const USER_CANCEL_ERRORS = new Set<LocalAuthentication.LocalAuthenticationError>([
  "user_cancel",
  "system_cancel",
  "app_cancel",
]);

function getBiometricLabel(supportedTypes: LocalAuthentication.AuthenticationType[]) {
  const hasFingerprint = supportedTypes.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );
  const hasFace = supportedTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );
  const hasIris = supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS);

  if (hasFingerprint && hasFace) return i18n.t("face_or_fingerprint");
  if (hasFace) return i18n.t("face_recognition");
  if (hasFingerprint) return i18n.t("fingerprint");
  if (hasIris) return i18n.t("iris_recognition");

  return i18n.t("biometrics");
}

function getAuthenticationErrorMessage(error: LocalAuthentication.LocalAuthenticationError) {
  if (USER_CANCEL_ERRORS.has(error)) {
    return i18n.t("biometric_cancelled");
  }

  switch (error) {
    case "not_available":
      return i18n.t("biometric_not_available");
    case "not_enrolled":
      return i18n.t("biometric_not_enrolled");
    case "lockout":
      return i18n.t("biometric_lockout");
    case "passcode_not_set":
      return i18n.t("biometric_passcode_not_set");
    default:
      return i18n.t("biometric_failed");
  }
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  if (!hasHardware || supportedTypes.length === 0) {
    return {
      available: false,
      message: i18n.t("biometric_not_available"),
      supportedTypes,
    };
  }

  if (!isEnrolled) {
    return {
      available: false,
      message: i18n.t("biometric_not_enrolled"),
      supportedTypes,
    };
  }

  return {
    available: true,
    label: getBiometricLabel(supportedTypes),
    supportedTypes,
  };
}

export async function authenticateBiometric({
  promptMessage,
  promptSubtitle,
  promptDescription,
}: AuthenticateBiometricOptions) {
  const availability = await getBiometricAvailability();

  if (!availability.available) {
    throw new Error(availability.message);
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptSubtitle,
    promptDescription,
    cancelLabel: i18n.t("cancel"),
    disableDeviceFallback: true,
    fallbackLabel: "",
    biometricsSecurityLevel: "weak",
  });

  if (!result.success) {
    throw new Error(getAuthenticationErrorMessage(result.error));
  }

  return availability;
}
