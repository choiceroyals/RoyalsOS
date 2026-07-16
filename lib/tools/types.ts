import type {
  RoyalOSEmployeeName,
  RoyalOSJsonObject,
  RoyalOSJsonValue,
  RoyalOSMissionMode,
  RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * ROYALOS TOOL CATEGORIES
 * ============================================================
 */

export const ROYALOS_TOOL_CATEGORIES = [
  "content",
  "image",
  "video",
  "website",
  "social_media",
  "research",
  "analytics",
  "communication",
  "storage",
  "operations",
  "developer",
] as const;

export type RoyalOSToolCategory =
  (typeof ROYALOS_TOOL_CATEGORIES)[number];

/*
 * ============================================================
 * TOOL PROVIDERS
 * ============================================================
 */

export const ROYALOS_TOOL_PROVIDERS = [
  "openai",
  "supabase",
  "wordpress",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
  "metricool",
  "google",
  "github",
  "stripe",
  "printful",
  "elevenlabs",
  "runway",
  "heygen",
  "distrokid",
  "custom",
] as const;

export type RoyalOSToolProvider =
  (typeof ROYALOS_TOOL_PROVIDERS)[number];

/*
 * ============================================================
 * TOOL RISK LEVELS
 * ============================================================
 */

export const ROYALOS_TOOL_RISK_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type RoyalOSToolRiskLevel =
  (typeof ROYALOS_TOOL_RISK_LEVELS)[number];

/*
 * ============================================================
 * APPROVAL POLICIES
 * ============================================================
 */

export const ROYALOS_TOOL_APPROVAL_POLICIES = [
  "never",
  "high_risk_only",
  "always",
] as const;

export type RoyalOSToolApprovalPolicy =
  (typeof ROYALOS_TOOL_APPROVAL_POLICIES)[number];

/*
 * ============================================================
 * TOOL ACTION STATUS
 * ============================================================
 */

export const ROYALOS_TOOL_ACTION_STATUSES = [
  "requested",
  "validating",
  "queued",
  "awaiting_approval",
  "approved",
  "running",
  "succeeded",
  "failed",
  "rejected",
  "cancelled",
] as const;

export type RoyalOSToolActionStatus =
  (typeof ROYALOS_TOOL_ACTION_STATUSES)[number];

/*
 * ============================================================
 * CONNECTION STATUS
 * ============================================================
 */

export const ROYALOS_TOOL_CONNECTION_STATUSES = [
  "not_configured",
  "disconnected",
  "connecting",
  "connected",
  "degraded",
  "error",
  "disabled",
] as const;

export type RoyalOSToolConnectionStatus =
  (typeof ROYALOS_TOOL_CONNECTION_STATUSES)[number];

/*
 * ============================================================
 * TOOL CAPABILITIES
 * ============================================================
 */

export const ROYALOS_TOOL_CAPABILITIES = [
  "generate_text",
  "generate_image",
  "edit_image",
  "generate_video_plan",
  "create_social_draft",
  "create_social_campaign",
  "publish_social_post",
  "schedule_social_post",
  "read_social_engagement",
  "manage_social_connections",
  "upload_media",
  "generate_video",
  "generate_voiceover",
  "read_website",
  "create_website_draft",
  "edit_live_website",
  "delete_website_content",
  "read_analytics",
  "perform_research",
  "send_email",
  "manage_calendar",
  "read_drive_files",
  "manage_documents",
  "manage_bookkeeping_records",
  "store_asset",
  "read_asset",
  "execute_code",
] as const;

export type RoyalOSToolCapability =
  (typeof ROYALOS_TOOL_CAPABILITIES)[number];

/*
 * ============================================================
 * TOOL INPUT FIELDS
 * ============================================================
 */

export const ROYALOS_TOOL_INPUT_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "boolean",
  "select",
  "multiselect",
  "url",
  "image",
  "file",
  "json",
] as const;

export type RoyalOSToolInputFieldType =
  (typeof ROYALOS_TOOL_INPUT_FIELD_TYPES)[number];

export type RoyalOSToolInputOption = {
  label: string;
  value: string;
};

export type RoyalOSToolInputField = {
  key: string;
  label: string;
  description?: string;

  type:
    RoyalOSToolInputFieldType;

  required:
    boolean;

  placeholder?: string;

  defaultValue?:
    RoyalOSJsonValue;

  options?:
    RoyalOSToolInputOption[];

  minimum?: number;

  maximum?: number;

  maximumLength?: number;

  acceptedFileTypes?:
    string[];

  sensitive?:
    boolean;
};

/*
 * ============================================================
 * TOOL DEFINITION
 * ============================================================
 */

export type RoyalOSToolDefinition = {
  id: string;

  name: string;

  description: string;

  version: string;

  category:
    RoyalOSToolCategory;

  provider:
    RoyalOSToolProvider;

  capabilities:
    RoyalOSToolCapability[];

  riskLevel:
    RoyalOSToolRiskLevel;

  approvalPolicy:
    RoyalOSToolApprovalPolicy;

  allowedEmployees:
    RoyalOSEmployeeName[];

  allowedWorkspaces?:
    RoyalOSWorkspace[];

  requiresConnection:
    boolean;

  connectionKey?:
    string;

  enabled:
    boolean;

  timeoutMs:
    number;

  maximumAttempts:
    number;

  inputFields?:
    RoyalOSToolInputField[];

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * TOOL EXECUTION CONTEXT
 * ============================================================
 */

export type RoyalOSToolRequester =
  | "CEO"
  | "system"
  | RoyalOSEmployeeName;

export type RoyalOSToolExecutionContext = {
  actionId: string;

  missionId?: string;

  employee:
    RoyalOSEmployeeName;

  requestedBy:
    RoyalOSToolRequester;

  workspace:
    RoyalOSWorkspace;

  mode:
    RoyalOSMissionMode;

  conversationId?: string;

  parentActionId?: string;

  requiresCEOApproval:
    boolean;

  approvedBy?: string;

  approvedAt?: string;

  requestTimestamp:
    string;

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * TOOL EXECUTION REQUEST
 * ============================================================
 */

export type RoyalOSToolExecutionRequest<
  TInput extends
    RoyalOSJsonObject =
      RoyalOSJsonObject,
> = {
  toolId: string;

  action: string;

  input: TInput;

  context:
    RoyalOSToolExecutionContext;
};

/*
 * ============================================================
 * TOOL EXECUTION RESULT
 * ============================================================
 */

export type RoyalOSToolExecutionResult<
  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
> = {
  actionId: string;

  toolId: string;

  status:
    RoyalOSToolActionStatus;

  success:
    boolean;

  output?:
    TOutput;

  error?: string;

  errorCode?: string;

  retryable?:
    boolean;

  externalId?: string;

  externalUrl?: string;

  startedAt:
    string;

  completedAt:
    string;

  durationMs:
    number;

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * TOOL HANDLER
 * ============================================================
 */

export type RoyalOSToolHandler<
  TInput extends
    RoyalOSJsonObject =
      RoyalOSJsonObject,

  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
> = (
  request:
    RoyalOSToolExecutionRequest<TInput>
) =>
  Promise<
    RoyalOSToolExecutionResult<TOutput>
  >;

/*
 * ============================================================
 * REGISTERED TOOL
 * ============================================================
 */

export type RoyalOSToolRegistration<
  TInput extends
    RoyalOSJsonObject =
      RoyalOSJsonObject,

  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
> = {
  definition:
    RoyalOSToolDefinition;

  handler:
    RoyalOSToolHandler<
      TInput,
      TOutput
    >;
};

/*
 * ============================================================
 * EMPLOYEE TOOL PERMISSIONS
 * ============================================================
 */

export type RoyalOSToolPermissionRule = {
  employee:
    RoyalOSEmployeeName;

  toolId:
    string;

  allowed:
    boolean;

  allowedCapabilities?:
    RoyalOSToolCapability[];

  allowedWorkspaces?:
    RoyalOSWorkspace[];

  approvalPolicyOverride?:
    RoyalOSToolApprovalPolicy;

  maximumActionsPerHour?:
    number;

  notes?:
    string;
};

export type RoyalOSToolPermissionDecision = {
  allowed:
    boolean;

  requiresApproval:
    boolean;

  riskLevel:
    RoyalOSToolRiskLevel;

  reason:
    string;

  matchedRule?:
    RoyalOSToolPermissionRule;
};

/*
 * ============================================================
 * TOOL APPROVALS
 * ============================================================
 */

export const ROYALOS_TOOL_APPROVAL_DECISIONS = [
  "approved",
  "rejected",
  "revision_requested",
] as const;

export type RoyalOSToolApprovalDecision =
  (typeof ROYALOS_TOOL_APPROVAL_DECISIONS)[number];

export type RoyalOSToolApprovalRequest = {
  approvalId: string;

  actionId: string;

  missionId?: string;

  toolId:
    string;

  action:
    string;

  employee:
    RoyalOSEmployeeName;

  workspace:
    RoyalOSWorkspace;

  riskLevel:
    RoyalOSToolRiskLevel;

  summary:
    string;

  inputPreview?:
    RoyalOSJsonObject;

  requestedAt:
    string;

  expiresAt?: string;

  status:
    | "pending"
    | RoyalOSToolApprovalDecision;
};

export type RoyalOSToolApprovalResponse = {
  approvalId: string;

  actionId: string;

  decision:
    RoyalOSToolApprovalDecision;

  decidedBy:
    string;

  decisionNote?: string;

  decidedAt:
    string;
};

/*
 * ============================================================
 * TOOL ACTION RECORD
 * ============================================================
 */

export type RoyalOSToolActionRecord = {
  id: string;

  action_id:
    string;

  mission_id:
    string | null;

  tool_id:
    string;

  action:
    string;

  employee:
    RoyalOSEmployeeName;

  requested_by:
    RoyalOSToolRequester;

  workspace:
    RoyalOSWorkspace;

  status:
    RoyalOSToolActionStatus;

  risk_level:
    RoyalOSToolRiskLevel;

  requires_ceo_approval:
    boolean;

  approval_id:
    string | null;

  input:
    RoyalOSJsonObject;

  output:
    RoyalOSJsonValue | null;

  error_message:
    string | null;

  error_code:
    string | null;

  external_id:
    string | null;

  external_url:
    string | null;

  attempt_count:
    number;

  started_at:
    string | null;

  completed_at:
    string | null;

  duration_ms:
    number | null;

  metadata:
    RoyalOSJsonObject;

  created_at:
    string;

  updated_at:
    string;
};

/*
 * ============================================================
 * APP CONNECTION RECORD
 * ============================================================
 */

export type RoyalOSToolConnectionRecord = {
  id: string;

  connection_key:
    string;

  provider:
    RoyalOSToolProvider;

  display_name:
    string;

  workspace:
    RoyalOSWorkspace | null;

  status:
    RoyalOSToolConnectionStatus;

  account_name:
    string | null;

  account_id:
    string | null;

  connected_by:
    string | null;

  connected_at:
    string | null;

  last_tested_at:
    string | null;

  last_success_at:
    string | null;

  last_error:
    string | null;

  enabled:
    boolean;

  configuration:
    RoyalOSJsonObject;

  metadata:
    RoyalOSJsonObject;

  created_at:
    string;

  updated_at:
    string;
};

/*
 * ============================================================
 * AUDIT EVENTS
 * ============================================================
 */

export const ROYALOS_TOOL_AUDIT_EVENT_TYPES = [
  "tool_requested",
  "permission_checked",
  "approval_requested",
  "approval_granted",
  "approval_rejected",
  "tool_started",
  "tool_succeeded",
  "tool_failed",
  "tool_cancelled",
  "connection_tested",
  "connection_changed",
] as const;

export type RoyalOSToolAuditEventType =
  (typeof ROYALOS_TOOL_AUDIT_EVENT_TYPES)[number];

export type RoyalOSToolAuditEvent = {
  eventId: string;

  eventType:
    RoyalOSToolAuditEventType;

  actionId?: string;

  missionId?: string;

  toolId?: string;

  employee?:
    RoyalOSEmployeeName;

  workspace?:
    RoyalOSWorkspace;

  message:
    string;

  timestamp:
    string;

  details?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * VALIDATION HELPERS
 * ============================================================
 */

export function isRoyalOSToolCategory(
  value: unknown
): value is RoyalOSToolCategory {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_CATEGORIES.includes(
      value as RoyalOSToolCategory
    )
  );
}

export function isRoyalOSToolProvider(
  value: unknown
): value is RoyalOSToolProvider {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_PROVIDERS.includes(
      value as RoyalOSToolProvider
    )
  );
}

export function isRoyalOSToolRiskLevel(
  value: unknown
): value is RoyalOSToolRiskLevel {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_RISK_LEVELS.includes(
      value as RoyalOSToolRiskLevel
    )
  );
}

export function isRoyalOSToolApprovalPolicy(
  value: unknown
): value is RoyalOSToolApprovalPolicy {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_APPROVAL_POLICIES.includes(
      value as RoyalOSToolApprovalPolicy
    )
  );
}

export function isRoyalOSToolActionStatus(
  value: unknown
): value is RoyalOSToolActionStatus {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_ACTION_STATUSES.includes(
      value as RoyalOSToolActionStatus
    )
  );
}

export function isRoyalOSToolConnectionStatus(
  value: unknown
): value is RoyalOSToolConnectionStatus {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_CONNECTION_STATUSES.includes(
      value as RoyalOSToolConnectionStatus
    )
  );
}

export function isRoyalOSToolCapability(
  value: unknown
): value is RoyalOSToolCapability {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_CAPABILITIES.includes(
      value as RoyalOSToolCapability
    )
  );
}

export function isRoyalOSToolApprovalDecision(
  value: unknown
): value is RoyalOSToolApprovalDecision {
  return (
    typeof value === "string" &&
    ROYALOS_TOOL_APPROVAL_DECISIONS.includes(
      value as RoyalOSToolApprovalDecision
    )
  );
}