import { useSyncExternalStore } from "react";

import {
  DASHBOARD_GROUP_IDS,
  DEFAULT_DASHBOARD_GROUP_ID,
  type DashboardGroupId,
} from "@/src/components/dashboard/dashboard-groups";

import { localStorage } from "./local-storage";

/**
 * Persisted, reactive selection of the active role-based dashboard. Chosen
 * manually through the dashboard switcher (for demonstration) and stored so the
 * choice survives launches.
 */
export const ACTIVE_DASHBOARD_KEY = "v1.dashboard.active-group";

function reconcile(id: string | null): DashboardGroupId {
  if (id && (DASHBOARD_GROUP_IDS as string[]).includes(id)) {
    return id as DashboardGroupId;
  }
  return DEFAULT_DASHBOARD_GROUP_ID;
}

let state: DashboardGroupId = reconcile(localStorage.getString(ACTIVE_DASHBOARD_KEY));
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

// This module is imported (and `state` initialised) before the startup
// hydration finishes, so re-read once the persisted value is available.
localStorage.onHydrated(() => {
  state = reconcile(localStorage.getString(ACTIVE_DASHBOARD_KEY));
  emit();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): DashboardGroupId {
  return state;
}

export function setActiveDashboardGroup(id: DashboardGroupId) {
  state = reconcile(id);
  void localStorage.setString(ACTIVE_DASHBOARD_KEY, state);
  emit();
}

export function getActiveDashboardGroup(): DashboardGroupId {
  return state;
}

export function useActiveDashboardGroup(): DashboardGroupId {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
