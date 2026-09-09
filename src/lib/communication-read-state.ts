import { useSyncExternalStore } from "react";

import { localStorage } from "./local-storage";

/**
 * Local, offline-first read / acknowledgement state for published
 * communications. Persisted through `localStorage` so already-viewed records
 * stay marked across launches and remain available without connectivity.
 *
 * Both `markCommunicationRead` and `acknowledgeCommunication` are idempotent —
 * re-opening or re-confirming a publication never produces a duplicate record.
 *
 * TODO: When a backend exists, treat this store as the local source of truth
 * and push pending read/ack events up on sync (keyed by publication id so the
 * server can dedupe too).
 */
export const COMMUNICATION_READ_STATE_KEY = "v1.communication.read-state";

export type CommunicationReadEntry = {
  readAt: string;
  acknowledgedAt: string | null;
};

export type CommunicationReadState = Record<string, CommunicationReadEntry>;

function loadInitialState(): CommunicationReadState {
  const raw = localStorage.getString(COMMUNICATION_READ_STATE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CommunicationReadState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("[communication] failed to parse read state", error);
    return {};
  }
}

let state: CommunicationReadState = loadInitialState();
const listeners = new Set<() => void>();

function persist() {
  void localStorage.setString(COMMUNICATION_READ_STATE_KEY, JSON.stringify(state));
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CommunicationReadState {
  return state;
}

/** Mark a publication read. No-op if it is already read (prevents duplicates). */
export function markCommunicationRead(id: string) {
  if (state[id]?.readAt) return;
  state = {
    ...state,
    [id]: { readAt: new Date().toISOString(), acknowledgedAt: state[id]?.acknowledgedAt ?? null },
  };
  persist();
  emit();
}

/**
 * Record an acknowledgement. No-op if already acknowledged (prevents
 * duplicates); also marks the record read if it somehow was not.
 */
export function acknowledgeCommunication(id: string) {
  const existing = state[id];
  if (existing?.acknowledgedAt) return;
  const now = new Date().toISOString();
  state = {
    ...state,
    [id]: { readAt: existing?.readAt ?? now, acknowledgedAt: now },
  };
  persist();
  emit();
}

/** Reactive accessor for the whole read-state map. */
export function useCommunicationReadState(): CommunicationReadState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function isPublicationRead(stateMap: CommunicationReadState, id: string): boolean {
  return Boolean(stateMap[id]?.readAt);
}

export function isPublicationAcknowledged(
  stateMap: CommunicationReadState,
  id: string,
): boolean {
  return Boolean(stateMap[id]?.acknowledgedAt);
}
