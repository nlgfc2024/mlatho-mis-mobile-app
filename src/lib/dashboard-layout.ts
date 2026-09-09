import { useSyncExternalStore } from "react";

import { MODULE_TILE_IDS, type ModuleTileId } from "@/src/components/dashboard/module-tiles";
import { localStorage } from "./local-storage";

/**
 * Persisted, reactive dashboard tile layout: the order tiles appear in and
 * which ones are hidden. Stored through `localStorage` so a user's customised
 * layout survives launches.
 */
export const DASHBOARD_LAYOUT_KEY = "v1.dashboard.tiles";

export type DashboardLayout = {
  order: ModuleTileId[];
  hidden: ModuleTileId[];
};

/**
 * Keep stored ids in sync with the current tile catalogue: drop ids that no
 * longer exist and append any new tiles (shown by default) at the end.
 */
function reconcile(stored: Partial<DashboardLayout> | null): DashboardLayout {
  const known = new Set(MODULE_TILE_IDS);
  const storedOrder = (stored?.order ?? []).filter((id) => known.has(id));
  const missing = MODULE_TILE_IDS.filter((id) => !storedOrder.includes(id));
  const order = [...storedOrder, ...missing];
  const hidden = (stored?.hidden ?? []).filter((id) => known.has(id));
  return { order, hidden };
}

function load(): DashboardLayout {
  const raw = localStorage.getString(DASHBOARD_LAYOUT_KEY);
  if (!raw) return reconcile(null);
  try {
    return reconcile(JSON.parse(raw) as Partial<DashboardLayout>);
  } catch (error) {
    console.warn("[dashboard] failed to parse layout", error);
    return reconcile(null);
  }
}

let state: DashboardLayout = load();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

// This module is imported (and `state` initialised) before the startup
// hydration finishes, so re-read once the persisted layout is available.
localStorage.onHydrated(() => {
  state = load();
  emit();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): DashboardLayout {
  return state;
}

export function saveDashboardLayout(layout: DashboardLayout) {
  state = reconcile(layout);
  void localStorage.setString(DASHBOARD_LAYOUT_KEY, JSON.stringify(state));
  emit();
}

export function resetDashboardLayout() {
  saveDashboardLayout({ order: MODULE_TILE_IDS, hidden: [] });
}

export function useDashboardLayout(): DashboardLayout {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
