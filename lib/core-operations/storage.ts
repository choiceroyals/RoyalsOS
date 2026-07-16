import { CORE_OPERATIONS_SEED } from "./seed";
import type { ApprovalRecord, CoreOperationsState, MissionPriority, MissionRecord } from "./types";

export const CORE_OPERATIONS_STORAGE_KEY = "royalos:core-operations:v1";
export const CORE_OPERATIONS_EVENT = "royalos:core-operations-updated";

function cloneSeed(): CoreOperationsState {
  return JSON.parse(JSON.stringify(CORE_OPERATIONS_SEED)) as CoreOperationsState;
}

export function loadCoreOperationsState(): CoreOperationsState {
  if (typeof window === "undefined") {
    return cloneSeed();
  }

  const raw = window.localStorage.getItem(CORE_OPERATIONS_STORAGE_KEY);
  if (!raw) return cloneSeed();

  try {
    const parsed = JSON.parse(raw) as Partial<CoreOperationsState>;
    if (parsed.version !== 1) return cloneSeed();

    return {
      ...cloneSeed(),
      ...parsed,
      workspaces: parsed.workspaces ?? cloneSeed().workspaces,
      missions: parsed.missions ?? cloneSeed().missions,
      approvals: parsed.approvals ?? cloneSeed().approvals,
      knowledge: parsed.knowledge ?? cloneSeed().knowledge,
      memories: parsed.memories ?? cloneSeed().memories,
      messages: parsed.messages ?? cloneSeed().messages,
      settings: {
        ...cloneSeed().settings,
        ...(parsed.settings ?? {}),
      },
      version: 1,
    };
  } catch {
    return cloneSeed();
  }
}

export function saveCoreOperationsState(
  state: CoreOperationsState,
  options?: { sourceId?: string; notify?: boolean },
): void {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(state);
  const current = window.localStorage.getItem(CORE_OPERATIONS_STORAGE_KEY);
  if (current === serialized) return;

  window.localStorage.setItem(CORE_OPERATIONS_STORAGE_KEY, serialized);

  if (options?.notify !== false) {
    window.dispatchEvent(
      new CustomEvent(CORE_OPERATIONS_EVENT, {
        detail: { sourceId: options?.sourceId, updatedAt: state.updatedAt },
      }),
    );
  }
}

export function resetCoreOperationsState(options?: { sourceId?: string }): CoreOperationsState {
  const seed = cloneSeed();
  saveCoreOperationsState(seed, { sourceId: options?.sourceId });
  return seed;
}


export function resolveCoreWorkspaceId(workspaceName: string): string {
  const state = loadCoreOperationsState();
  return (
    state.workspaces.find(
      (workspace) => workspace.name.toLowerCase() === workspaceName.trim().toLowerCase(),
    )?.id ?? state.settings.defaultWorkspaceId
  );
}

export function createCoreApproval(
  input: Omit<ApprovalRecord, "id" | "status" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): ApprovalRecord {
  const state = loadCoreOperationsState();
  const now = new Date().toISOString();
  const existing = input.sourceId
    ? state.approvals.find(
        (approval) =>
          approval.sourceId === input.sourceId &&
          approval.sourceType === input.sourceType &&
          approval.status === "Pending",
      )
    : undefined;
  if (existing) return existing;

  const approval: ApprovalRecord = {
    ...input,
    id:
      input.id ??
      `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "Pending",
    createdAt: now,
    updatedAt: now,
  };
  saveCoreOperationsState({
    ...state,
    approvals: [approval, ...state.approvals],
    updatedAt: now,
  });
  return approval;
}

export function getCoreApproval(id?: string): ApprovalRecord | undefined {
  if (!id) return undefined;
  return loadCoreOperationsState().approvals.find((approval) => approval.id === id);
}


export function updateCoreApprovalStatus(
  id: string,
  status: ApprovalRecord["status"],
): ApprovalRecord | undefined {
  const state = loadCoreOperationsState();
  let updated: ApprovalRecord | undefined;
  const approvals = state.approvals.map((approval) => {
    if (approval.id !== id) return approval;
    updated = { ...approval, status, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (updated) {
    saveCoreOperationsState({
      ...state,
      approvals,
      updatedAt: new Date().toISOString(),
    });
  }
  return updated;
}


export function createEmployeeMission(input: {
  title: string;
  description: string;
  leadEmployee: string;
  workspaceName?: string;
  supportingEmployees?: string[];
  priority?: MissionPriority;
}): MissionRecord {
  const state = loadCoreOperationsState();
  const now = new Date().toISOString();
  const workspaceId = input.workspaceName
    ? resolveCoreWorkspaceId(input.workspaceName)
    : state.settings.defaultWorkspaceId;
  const mission: MissionRecord = {
    id: `mission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    workspaceId,
    description: input.description,
    leadEmployee: input.leadEmployee,
    supportingEmployees: input.supportingEmployees ?? [],
    priority: input.priority ?? "High",
    status: "Planning",
    progress: 0,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  saveCoreOperationsState({
    ...state,
    missions: [mission, ...state.missions],
    messages: [
      {
        id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from: "RoyalOS System Care",
        to: input.leadEmployee,
        subject: input.title,
        body: input.description,
        workspaceId,
        kind: "System",
        createdAt: now,
        read: false,
      },
      ...state.messages,
    ],
    updatedAt: now,
  });
  return mission;
}
