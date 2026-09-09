export type StartupDestination = "login" | "biometric" | "setup" | "dashboard";

export type StartupLoadingReason =
  | "session"
  | "network"
  | "local-data"
  | "access-profile"
  | "dashboard";

export type StartupErrorKind =
  | "local-data"
  | "offline"
  | "access-profile"
  | "permissions"
  | "dashboard";

export type StartupResolution =
  | {
      status: "loading";
      reason: StartupLoadingReason;
    }
  | {
      status: "error";
      kind: StartupErrorKind;
    }
  | {
      status: "ready";
      destination: StartupDestination;
      offline: boolean;
    };

export type StartupStateInput = {
  sessionResolved: boolean;
  authenticated: boolean;
  biometricLocked: boolean;
  networkResolved: boolean;
  online: boolean;
  localState: "loading" | "ready" | "error";
  onboardingComplete: boolean;
  accessProfile: "loading" | "available" | "error";
  hasRole: boolean;
  hasPermissions: boolean;
  hasDashboard: boolean;
  dashboardSelectionReady: boolean;
};

/**
 * Produces exactly one startup destination. Unknown values never fall through
 * to a route, which prevents an initial empty cache from being interpreted as
 * a signed-out or fully-onboarded state.
 */
export function resolveStartupState(input: StartupStateInput): StartupResolution {
  if (!input.sessionResolved) {
    return { status: "loading", reason: "session" };
  }

  if (!input.authenticated) {
    return { status: "ready", destination: "login", offline: !input.online };
  }

  if (input.biometricLocked) {
    return { status: "ready", destination: "biometric", offline: !input.online };
  }

  if (!input.networkResolved) {
    return { status: "loading", reason: "network" };
  }

  if (input.localState === "loading") {
    return { status: "loading", reason: "local-data" };
  }
  if (input.localState === "error") {
    return { status: "error", kind: "local-data" };
  }

  // When online, the access-profile request doubles as a lightweight remote
  // session check. Do not expose setup with a server-rejected token.
  if (input.online && input.accessProfile === "loading") {
    return { status: "loading", reason: "access-profile" };
  }
  if (input.online && input.accessProfile === "error") {
    return { status: "error", kind: "access-profile" };
  }

  // Setup owns incomplete and failed initial synchronization states. Its
  // existing step UI distinguishes offline, failed, pending, and retryable
  // work without making startup wait for a remote request.
  if (!input.onboardingComplete) {
    return { status: "ready", destination: "setup", offline: !input.online };
  }

  if (input.accessProfile === "loading") {
    return { status: "error", kind: "offline" };
  }
  if (input.accessProfile === "error") {
    return { status: "error", kind: input.online ? "access-profile" : "offline" };
  }
  if (!input.hasRole || !input.hasPermissions) {
    return { status: "error", kind: "permissions" };
  }
  if (!input.hasDashboard) {
    return { status: "error", kind: "dashboard" };
  }
  if (!input.dashboardSelectionReady) {
    return { status: "loading", reason: "dashboard" };
  }

  return { status: "ready", destination: "dashboard", offline: !input.online };
}
