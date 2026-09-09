// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";

import { getSessionTokenState } from "../src/startup/session-token.ts";
import {
  resolveStartupState,
  type StartupStateInput,
} from "../src/startup/startup-state.ts";

const readyDashboard: StartupStateInput = {
  sessionResolved: true,
  authenticated: true,
  biometricLocked: false,
  networkResolved: true,
  online: true,
  localState: "ready",
  onboardingComplete: true,
  accessProfile: "available",
  hasRole: true,
  hasPermissions: true,
  hasDashboard: true,
  dashboardSelectionReady: true,
};

function resolve(overrides: Partial<StartupStateInput> = {}) {
  return resolveStartupState({ ...readyDashboard, ...overrides });
}

test("keeps the startup screen while authentication is unknown", () => {
  assert.deepEqual(resolve({ sessionResolved: false, authenticated: false }), {
    status: "loading",
    reason: "session",
  });
});

test("shows login only after confirming there is no authenticated user", () => {
  assert.deepEqual(resolve({ authenticated: false }), {
    status: "ready",
    destination: "login",
    offline: false,
  });
});

test("routes a locked authenticated session only to biometric unlock", () => {
  assert.deepEqual(resolve({ biometricLocked: true }), {
    status: "ready",
    destination: "biometric",
    offline: false,
  });
});

test("waits for network, local state, remote session validation, and dashboard selection", () => {
  assert.equal(resolve({ networkResolved: false }).status, "loading");
  assert.equal(resolve({ localState: "loading" }).status, "loading");
  assert.equal(resolve({ accessProfile: "loading" }).status, "loading");
  assert.equal(resolve({ dashboardSelectionReady: false }).status, "loading");
});

test("routes missing location, onboarding, or initial sync to setup", () => {
  assert.deepEqual(resolve({ onboardingComplete: false }), {
    status: "ready",
    destination: "setup",
    offline: false,
  });
});

test("allows incomplete setup to continue offline without blocking forever", () => {
  assert.deepEqual(
    resolve({
      online: false,
      onboardingComplete: false,
      accessProfile: "loading",
    }),
    {
      status: "ready",
      destination: "setup",
      offline: true,
    },
  );
});

test("opens the dashboard offline only when cached access data is available", () => {
  assert.deepEqual(resolve({ online: false }), {
    status: "ready",
    destination: "dashboard",
    offline: true,
  });
  assert.deepEqual(resolve({ online: false, accessProfile: "loading" }), {
    status: "error",
    kind: "offline",
  });
});

test("distinguishes local, access, permission, and dashboard errors", () => {
  assert.deepEqual(resolve({ localState: "error" }), {
    status: "error",
    kind: "local-data",
  });
  assert.deepEqual(resolve({ accessProfile: "error" }), {
    status: "error",
    kind: "access-profile",
  });
  assert.deepEqual(resolve({ hasRole: false }), {
    status: "error",
    kind: "permissions",
  });
  assert.deepEqual(resolve({ hasPermissions: false }), {
    status: "error",
    kind: "permissions",
  });
  assert.deepEqual(resolve({ hasDashboard: false }), {
    status: "error",
    kind: "dashboard",
  });
});

test("startup routing stays constant-time for a large local dataset", () => {
  const startedAt = performance.now();
  for (let index = 0; index < 100_000; index += 1) {
    assert.equal(resolve().status, "ready");
  }
  assert.ok(performance.now() - startedAt < 1_000);
});

function jwtWithExpiration(exp: number) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.signature`;
}

test("rejects expired JWT sessions locally before protected navigation", () => {
  assert.equal(getSessionTokenState(null, 2_000), "missing");
  assert.equal(getSessionTokenState(jwtWithExpiration(1), 2_000), "expired");
  assert.equal(getSessionTokenState(jwtWithExpiration(3), 2_000), "valid");
  assert.equal(getSessionTokenState("server-managed-token", 2_000), "opaque");
});
