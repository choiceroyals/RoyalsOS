export const ROYALOS_MISSION_MODES = [
  "Task",
  "Mission",
] as const;

export type RoyalOSMissionMode =
  (typeof ROYALOS_MISSION_MODES)[number];

export const ROYALOS_MISSION_STATUSES = [
  "planning",
  "queued",
  "in_progress",
  "waiting_for_approval",
  "approved",
  "revision_requested",
  "completed",
  "failed",
  "cancelled",
  "archived",
] as const;

export type RoyalOSMissionStatus =
  (typeof ROYALOS_MISSION_STATUSES)[number];

export const ROYALOS_CEO_DECISIONS = [
  "approved",
  "rejected",
  "revision_requested",
] as const;

export type RoyalOSCEODecision =
  (typeof ROYALOS_CEO_DECISIONS)[number];

import {
  ROYALOS_EMPLOYEE_NAMES,
  isRoyalOSEmployeeName as isConfiguredRoyalOSEmployeeName,
  type RoyalOSEmployeeName,
} from "@/lib/employees/config";

export const ROYALOS_EMPLOYEES =
  ROYALOS_EMPLOYEE_NAMES;

export type { RoyalOSEmployeeName };

export const ROYALOS_WORKSPACES = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
] as const;

export type RoyalOSWorkspace =
  (typeof ROYALOS_WORKSPACES)[number];

  export function isRoyalOSWorkspace(
  value: unknown
): value is RoyalOSWorkspace {
  return (
    typeof value === "string" &&
    ROYALOS_WORKSPACES.includes(
      value as RoyalOSWorkspace
    )
  );
}
export type RoyalOSWorkspaceName =
  (typeof ROYALOS_WORKSPACES)[number];

export type RoyalOSJsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type RoyalOSJsonObject = {
  [key: string]:
    RoyalOSJsonValue |
    undefined;
};

export type RoyalOSJsonValue =
  | RoyalOSJsonPrimitive
  | RoyalOSJsonValue[]
  | RoyalOSJsonObject;

export type RoyalOSMissionBrainPlan = {
  objective?: string;

  taskType?: string;

  complexity?: string;

  primaryEmployee?:
    RoyalOSEmployeeName;

  supportingEmployees?:
    RoyalOSEmployeeName[];

  requiresTeam?: boolean;

  routingReason?: string;

  knowledgeFocus?: string[];

  deliverables?: string[];

  risks?: string[];

  requiresCEOApproval?: boolean;

  [key: string]:
    RoyalOSJsonValue |
    undefined;
};

export type RoyalOSMissionCollaboration = {
  participatingEmployees?:
    RoyalOSEmployeeName[];

  skippedEmployees?:
    RoyalOSEmployeeName[];

  completedReports?: number;

  failedReports?: number;

  timedOutReports?: number;

  collaborationSucceeded?: boolean;

  reports?: Array<{
    employee:
      RoyalOSEmployeeName;

    status:
      | "completed"
      | "failed"
      | "timed_out"
      | "skipped";

    durationMs?: number;

    error?: string;

    [key: string]:
      RoyalOSJsonValue |
      undefined;
  }>;

  [key: string]:
    RoyalOSJsonValue |
    undefined;
};

export type RoyalOSMissionPerformance = {
  knowledgeIndexMs?: number;

  brainPlanningMs?: number;

  memoryRetrievalMs?: number;

  employeeCollaborationMs?: number;

  executiveSynthesisMs?: number;

  orchestrationTotalMs?: number;

  memorySaveMs?: number;

  totalRequestMs?: number;

  [key: string]:
    RoyalOSJsonValue |
    undefined;
};

export type RoyalOSMissionRecord = {
  id: string;

  mission_id: string;

  title: string;

  objective: string;

  workspace: string;

  mode:
    RoyalOSMissionMode;

  status:
    RoyalOSMissionStatus;

  progress: number;

  requested_employee:
    RoyalOSEmployeeName |
    null;

  lead_employee:
    RoyalOSEmployeeName |
    null;

  supporting_employees:
    RoyalOSEmployeeName[];

  participating_employees:
    RoyalOSEmployeeName[];

  brain_plan:
    RoyalOSMissionBrainPlan;

  collaboration:
    RoyalOSMissionCollaboration;

  executive_briefing:
    string |
    null;

  deliverables:
    string[];

  risks:
    string[];

  requires_ceo_approval:
    boolean;

  ceo_decision:
    RoyalOSCEODecision |
    null;

  ceo_decision_note:
    string |
    null;

  approved_at:
    string |
    null;

  completed_at:
    string |
    null;

  failed_at:
    string |
    null;

  error_message:
    string |
    null;

  model:
    string |
    null;

  response_id:
    string |
    null;

  documents_discovered:
    number;

  documents_loaded:
    number;

  memories_retrieved:
    number;

  memories_saved:
    number;

  memory_ids:
    string[];

  quality_score:
    number |
    null;

  quality_passed:
    boolean |
    null;

  performance:
    RoyalOSMissionPerformance;

  metadata: {
    [key: string]:
      RoyalOSJsonValue;
  };

  created_at: string;

  updated_at: string;
};

export type CreateRoyalOSMissionInput = {
  missionId: string;

  title: string;

  objective: string;

  workspace:
    RoyalOSWorkspaceName |
    string;

  mode:
    RoyalOSMissionMode;

  status?:
    RoyalOSMissionStatus;

  progress?: number;

  requestedEmployee?:
    RoyalOSEmployeeName;

  leadEmployee?:
    RoyalOSEmployeeName;

  supportingEmployees?:
    RoyalOSEmployeeName[];

  participatingEmployees?:
    RoyalOSEmployeeName[];

  brainPlan?:
    RoyalOSMissionBrainPlan;

  collaboration?:
    RoyalOSMissionCollaboration;

  executiveBriefing?:
    string;

  deliverables?:
    string[];

  risks?:
    string[];

  requiresCEOApproval?:
    boolean;

  model?:
    string;

  responseId?:
    string;

  documentsDiscovered?:
    number;

  documentsLoaded?:
    number;

  memoriesRetrieved?:
    number;

  memoriesSaved?:
    number;

  memoryIds?:
    string[];

  qualityScore?:
    number;

  qualityPassed?:
    boolean;

  performance?:
    RoyalOSMissionPerformance;

  metadata?: {
    [key: string]:
      RoyalOSJsonValue;
  };
};

export type UpdateRoyalOSMissionInput = {
  title?: string;

  objective?: string;

  workspace?:
    RoyalOSWorkspaceName |
    string;

  mode?:
    RoyalOSMissionMode;

  status?:
    RoyalOSMissionStatus;

  progress?: number;

  requestedEmployee?:
    RoyalOSEmployeeName |
    null;

  leadEmployee?:
    RoyalOSEmployeeName |
    null;

  supportingEmployees?:
    RoyalOSEmployeeName[];

  participatingEmployees?:
    RoyalOSEmployeeName[];

  brainPlan?:
    RoyalOSMissionBrainPlan;

  collaboration?:
    RoyalOSMissionCollaboration;

  executiveBriefing?:
    string |
    null;

  deliverables?:
    string[];

  risks?:
    string[];

  requiresCEOApproval?:
    boolean;

  ceoDecision?:
    RoyalOSCEODecision |
    null;

  ceoDecisionNote?:
    string |
    null;

  approvedAt?:
    string |
    null;

  completedAt?:
    string |
    null;

  failedAt?:
    string |
    null;

  errorMessage?:
    string |
    null;

  model?:
    string |
    null;

  responseId?:
    string |
    null;

  documentsDiscovered?:
    number;

  documentsLoaded?:
    number;

  memoriesRetrieved?:
    number;

  memoriesSaved?:
    number;

  memoryIds?:
    string[];

  qualityScore?:
    number |
    null;

  qualityPassed?:
    boolean |
    null;

  performance?:
    RoyalOSMissionPerformance;

  metadata?: {
    [key: string]:
      RoyalOSJsonValue;
  };
};

export type RoyalOSMissionFilters = {
  status?:
    RoyalOSMissionStatus |
    RoyalOSMissionStatus[];

  workspace?: string;

  leadEmployee?:
    RoyalOSEmployeeName;

  requestedEmployee?:
    RoyalOSEmployeeName;

  requiresCEOApproval?:
    boolean;

  ceoDecision?:
    RoyalOSCEODecision |
    null;

  search?: string;

  limit?: number;

  offset?: number;

  order?:
    | "newest"
    | "oldest";
};

export type RoyalOSMissionListResult = {
  missions:
    RoyalOSMissionRecord[];

  count: number;

  limit: number;

  offset: number;
};

export type RoyalOSMissionDecisionInput = {
  decision:
    RoyalOSCEODecision;

  note?: string;
};

export function isRoyalOSMissionMode(
  value: unknown
): value is RoyalOSMissionMode {
  return (
    typeof value === "string" &&
    ROYALOS_MISSION_MODES.includes(
      value as RoyalOSMissionMode
    )
  );
}

export function isRoyalOSMissionStatus(
  value: unknown
): value is RoyalOSMissionStatus {
  return (
    typeof value === "string" &&
    ROYALOS_MISSION_STATUSES.includes(
      value as RoyalOSMissionStatus
    )
  );
}

export function isRoyalOSCEODecision(
  value: unknown
): value is RoyalOSCEODecision {
  return (
    typeof value === "string" &&
    ROYALOS_CEO_DECISIONS.includes(
      value as RoyalOSCEODecision
    )
  );
}

export function isRoyalOSEmployeeName(
  value: unknown
): value is RoyalOSEmployeeName {
  return isConfiguredRoyalOSEmployeeName(
    value
  );
}

export function clampMissionProgress(
  value: number
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(value)
    )
  );
}