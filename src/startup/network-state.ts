import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useSyncExternalStore } from "react";

export type StartupNetworkState = {
  resolved: boolean;
  online: boolean;
};

let snapshot: StartupNetworkState = { resolved: false, online: false };
let monitoringStarted = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function updateFromNetInfo(state: NetInfoState) {
  const next = {
    resolved: true,
    online: state.isConnected === true && state.isInternetReachable !== false,
  };
  if (snapshot.resolved === next.resolved && snapshot.online === next.online) return;
  snapshot = next;
  emit();
}

export function ensureNetworkMonitoring() {
  if (monitoringStarted) return;
  monitoringStarted = true;

  NetInfo.addEventListener(updateFromNetInfo);
  void NetInfo.fetch().then(updateFromNetInfo, () => {
    // A NetInfo failure is actionable as offline rather than an endless
    // unknown state. A later subscription update will recover automatically.
    if (snapshot.resolved) return;
    snapshot = { resolved: true, online: false };
    emit();
  });
}

export function subscribeToStartupNetwork(listener: () => void) {
  ensureNetworkMonitoring();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStartupNetworkState() {
  ensureNetworkMonitoring();
  return snapshot;
}

export function useStartupNetworkState() {
  return useSyncExternalStore(
    subscribeToStartupNetwork,
    getStartupNetworkState,
    getStartupNetworkState,
  );
}
