import { Store } from "@tanstack/react-store";

export type SyncStepState = "pending" | "running" | "success" | "failed";
export type SyncSessionState =
  | "idle"
  | "running"
  | "paused_offline"
  | "waiting_to_resume"
  | "resuming"
  | "succeeded"
  | "failed";

export interface SyncStep {
  id: string;
  label: string;
  state: SyncStepState;
  error?: string;
}

export interface SyncProgressState {
  source: string | null;
  session: SyncSessionState;
  startedAt: number | null;
  endedAt: number | null;
  steps: SyncStep[];
}

const initialState: SyncProgressState = {
  source: null,
  session: "idle",
  startedAt: null,
  endedAt: null,
  steps: [],
};

export const syncProgressStore = new Store<SyncProgressState>(initialState);

export type SyncStepDefinition = Pick<SyncStep, "id" | "label">;

export function startSyncSession(
  source: string,
  steps: SyncStepDefinition[],
  session: Extract<SyncSessionState, "running" | "resuming"> = "running",
) {
  syncProgressStore.setState(() => ({
    source,
    session,
    startedAt: Date.now(),
    endedAt: null,
    steps: steps.map((step) => ({ ...step, state: "pending" satisfies SyncStepState })),
  }));
}

export function endSyncSession(status: Extract<SyncSessionState, "succeeded" | "failed">) {
  syncProgressStore.setState((state) => ({
    ...state,
    session: status,
    endedAt: Date.now(),
  }));
}

export function resetSyncSession() {
  syncProgressStore.setState(() => initialState);
}

export function pauseSyncSessionForOffline() {
  syncProgressStore.setState((state) => ({
    ...state,
    session: "paused_offline",
    endedAt: null,
    steps: state.steps.map((step) =>
      step.state === "running" || step.state === "failed"
        ? { ...step, state: "pending", error: undefined }
        : step,
    ),
  }));
}

export function markSyncWaitingToResume() {
  syncProgressStore.setState((state) =>
    state.session === "paused_offline" ? { ...state, session: "waiting_to_resume" } : state,
  );
}

export function markSyncResuming() {
  syncProgressStore.setState((state) =>
    state.session === "paused_offline" || state.session === "waiting_to_resume"
      ? { ...state, session: "resuming" }
      : state,
  );
}

export function restoreSyncSession(progress: SyncProgressState) {
  if (progress.session === "succeeded" || progress.session === "idle") return;

  syncProgressStore.setState(() => ({
    ...progress,
    session: progress.session === "paused_offline" ? "paused_offline" : "waiting_to_resume",
    steps: progress.steps.map((step) =>
      step.state === "running" ? { ...step, state: "pending" } : step,
    ),
  }));
}

function patchStep(id: string, patch: Partial<SyncStep>) {
  syncProgressStore.setState((state) => ({
    ...state,
    steps: state.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
  }));
}

export async function runSyncStep<T>(
  id: string,
  fn: () => Promise<T>,
  onStarted?: () => Promise<void>,
): Promise<T> {
  patchStep(id, { state: "running", error: undefined });
  await onStarted?.();

  try {
    const result = await fn();
    patchStep(id, { state: "success" });
    return result;
  } catch (error) {
    patchStep(id, {
      state: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
