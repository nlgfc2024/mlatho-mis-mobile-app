const STORAGE_VERSION = "v1";

export const STORAGE_KEYS = {
  APP_LANGUAGE: `${STORAGE_VERSION}.app.language`,
  APP_THEME: `${STORAGE_VERSION}.app.theme`,
  APP_NOTIFICATIONS: `${STORAGE_VERSION}.app.notifications`,
  APP_SCREENSHOTS_ALLOWED: `${STORAGE_VERSION}.app.screenshotsAllowed`,

  SESSION_AUTH_TOKEN: `${STORAGE_VERSION}.session.authToken`,
  SESSION_CSRF_TOKEN: `${STORAGE_VERSION}.session.csrfToken`,
  SESSION_USER: `${STORAGE_VERSION}.session.user`,
  SESSION_EXPIRES: `${STORAGE_VERSION}.session.expiresAt`,

  BIOMETRIC_AUTH_ENABLED: `${STORAGE_VERSION}.biometricAuth.enabled`,
  BIOMETRIC_AUTH_USER_REFERENCE: `${STORAGE_VERSION}.biometricAuth.userReference`,

  USER_PREFERENCES: `${STORAGE_VERSION}.user.preferences`,

  SYSTEM_APP_VERSION: `system.appVersion`,
  SYSTEM_LAST_CRASH: `system.lastCrash`,
};
