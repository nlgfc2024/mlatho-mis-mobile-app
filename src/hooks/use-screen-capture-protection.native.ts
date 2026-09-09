import { usePreventScreenCapture } from "expo-screen-capture";

const SCREEN_CAPTURE_PROTECTION_KEY = "tasaf-app";

/** Prevent screenshots and screen recordings for the entire native app. */
export function useScreenCaptureProtection(key = SCREEN_CAPTURE_PROTECTION_KEY) {
  usePreventScreenCapture(key);
}
