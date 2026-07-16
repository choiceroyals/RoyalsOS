import "server-only";

import {
  getRoyalOSToolsSupabaseClient,
} from "@/lib/tools/supabase";

import type {
  RoyalOSToolActionRecord,
  RoyalOSToolActionStatus,
  RoyalOSToolApprovalDecision,
  RoyalOSToolAuditEvent,
  RoyalOSToolConnectionRecord,
  RoyalOSToolConnectionStatus,
  RoyalOSToolProvider,
  RoyalOSToolRequester,
  RoyalOSToolRiskLevel,
} from "@/lib/tools/types";

import type {
  RoyalOSEmployeeName,
  RoyalOSJsonObject,
  RoyalOSJsonValue,
  RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * DATABASE TABLES
 * ============================================================
 */

const TOOL_ACTIONS_TABLE =
  "royalos_tool_actions";

const TOOL_APPROVALS_TABLE =
  "royalos_tool_approvals";

const TOOL_CONNECTIONS_TABLE =
  "royalos_tool_connections";

const ASSETS_TABLE =
  "royalos_assets";

const TOOL_AUDIT_TABLE =
  "royalos_tool_audit_events";

const ASSET_BUCKET =
  "royalos-assets";

/*
 * ============================================================
 * APPROVAL TYPES
 * ============================================================
 */

export type RoyalOSToolApprovalStatus =
  | "pending"
  | RoyalOSToolApprovalDecision;

export type RoyalOSToolApprovalRecord = {
  id: string;

  approval_id: string;

  action_id: string;

  mission_id:
    string | null;

  tool_id: string;

  action: string;

  employee:
    RoyalOSEmployeeName;

  workspace:
    RoyalOSWorkspace;

  risk_level:
    RoyalOSToolRiskLevel;

  summary: string;

  input_preview:
    RoyalOSJsonObject;

  status:
    RoyalOSToolApprovalStatus;

  requested_at: string;

  expires_at:
    string | null;

  decided_by:
    string | null;

  decision_note:
    string | null;

  decided_at:
    string | null;

  created_at: string;

  updated_at: string;
};

/*
 * ============================================================
 * ASSET TYPES
 * ============================================================
 */

export const ROYALOS_ASSET_TYPES = [
  "image",
  "video",
  "audio",
  "document",
  "website_file",
  "other",
] as const;

export type RoyalOSAssetType =
  (typeof ROYALOS_ASSET_TYPES)[number];

export const ROYALOS_ASSET_STATUSES = [
  "processing",
  "ready",
  "failed",
  "archived",
] as const;

export type RoyalOSAssetStatus =
  (typeof ROYALOS_ASSET_STATUSES)[number];

export const ROYALOS_ASSET_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "revision_requested",
] as const;

export type RoyalOSAssetApprovalStatus =
  (typeof ROYALOS_ASSET_APPROVAL_STATUSES)[number];

export type RoyalOSAssetRecord = {
  id: string;

  asset_id: string;

  mission_id:
    string | null;

  action_id:
    string | null;

  workspace:
    RoyalOSWorkspace;

  created_by_employee:
    RoyalOSEmployeeName;

  asset_type:
    RoyalOSAssetType;

  provider:
    RoyalOSToolProvider;

  status:
    RoyalOSAssetStatus;

  title: string;

  description:
    string | null;

  prompt:
    string | null;

  revised_prompt:
    string | null;

  storage_bucket:
    string;

  storage_path:
    string | null;

  public_url:
    string | null;

  mime_type:
    string | null;

  width:
    number | null;

  height:
    number | null;

  size_bytes:
    number | null;

  approval_status:
    RoyalOSAssetApprovalStatus;

  approved_by:
    string | null;

  approved_at:
    string | null;

  metadata:
    RoyalOSJsonObject;

  created_at: string;

  updated_at: string;
};

/*
 * ============================================================
 * CREATE AND UPDATE INPUTS
 * ============================================================
 */

export type CreateRoyalOSToolActionInput = {
  actionId: string;

  missionId?: string;

  toolId: string;

  action: string;

  employee:
    RoyalOSEmployeeName;

  requestedBy:
    RoyalOSToolRequester;

  workspace:
    RoyalOSWorkspace;

  status?:
    RoyalOSToolActionStatus;

  riskLevel?:
    RoyalOSToolRiskLevel;

  requiresCEOApproval?:
    boolean;

  approvalId?: string;

  input?:
    RoyalOSJsonObject;

  output?:
    RoyalOSJsonValue;

  errorMessage?: string;

  errorCode?: string;

  externalId?: string;

  externalUrl?: string;

  attemptCount?: number;

  startedAt?: string;

  completedAt?: string;

  durationMs?: number;

  metadata?:
    RoyalOSJsonObject;
};

export type UpdateRoyalOSToolActionInput = {
  status?:
    RoyalOSToolActionStatus;

  riskLevel?:
    RoyalOSToolRiskLevel;

  requiresCEOApproval?:
    boolean;

  approvalId?:
    string | null;

  output?:
    RoyalOSJsonValue | null;

  errorMessage?:
    string | null;

  errorCode?:
    string | null;

  externalId?:
    string | null;

  externalUrl?:
    string | null;

  attemptCount?:
    number;

  startedAt?:
    string | null;

  completedAt?:
    string | null;

  durationMs?:
    number | null;

  metadata?:
    RoyalOSJsonObject;
};

export type CreateRoyalOSToolApprovalInput = {
  approvalId: string;

  actionId: string;

  missionId?: string;

  toolId: string;

  action: string;

  employee:
    RoyalOSEmployeeName;

  workspace:
    RoyalOSWorkspace;

  riskLevel:
    RoyalOSToolRiskLevel;

  summary: string;

  inputPreview?:
    RoyalOSJsonObject;

  expiresAt?: string;
};

export type DecideRoyalOSToolApprovalInput = {
  decision:
    RoyalOSToolApprovalDecision;

  decidedBy: string;

  decisionNote?: string;
};

export type CreateRoyalOSAssetInput = {
  assetId: string;

  missionId?: string;

  actionId?: string;

  workspace:
    RoyalOSWorkspace;

  createdByEmployee:
    RoyalOSEmployeeName;

  assetType:
    RoyalOSAssetType;

  provider:
    RoyalOSToolProvider;

  status?:
    RoyalOSAssetStatus;

  title: string;

  description?: string;

  prompt?: string;

  revisedPrompt?: string;

  storageBucket?: string;

  storagePath?: string;

  publicUrl?: string;

  mimeType?: string;

  width?: number;

  height?: number;

  sizeBytes?: number;

  approvalStatus?:
    RoyalOSAssetApprovalStatus;

  approvedBy?: string;

  approvedAt?: string;

  metadata?:
    RoyalOSJsonObject;
};

export type UpdateRoyalOSAssetInput = {
  status?:
    RoyalOSAssetStatus;

  title?: string;

  description?:
    string | null;

  prompt?:
    string | null;

  revisedPrompt?:
    string | null;

  storageBucket?: string;

  storagePath?:
    string | null;

  publicUrl?:
    string | null;

  mimeType?:
    string | null;

  width?:
    number | null;

  height?:
    number | null;

  sizeBytes?:
    number | null;

  approvalStatus?:
    RoyalOSAssetApprovalStatus;

  approvedBy?:
    string | null;

  approvedAt?:
    string | null;

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * FILTER TYPES
 * ============================================================
 */

export type RoyalOSToolActionFilters = {
  missionId?: string;

  toolId?: string;

  employee?:
    RoyalOSEmployeeName;

  workspace?:
    RoyalOSWorkspace;

  status?:
    | RoyalOSToolActionStatus
    | RoyalOSToolActionStatus[];

  limit?: number;

  offset?: number;

  order?:
    | "newest"
    | "oldest";
};

export type RoyalOSToolApprovalFilters = {
  missionId?: string;

  actionId?: string;

  employee?:
    RoyalOSEmployeeName;

  workspace?:
    RoyalOSWorkspace;

  status?:
    | RoyalOSToolApprovalStatus
    | RoyalOSToolApprovalStatus[];

  limit?: number;

  offset?: number;

  order?:
    | "newest"
    | "oldest";
};

export type RoyalOSAssetFilters = {
  missionId?: string;

  actionId?: string;

  employee?:
    RoyalOSEmployeeName;

  workspace?:
    RoyalOSWorkspace;

  assetType?:
    RoyalOSAssetType;

  status?:
    RoyalOSAssetStatus;

  approvalStatus?:
    RoyalOSAssetApprovalStatus;

  limit?: number;

  offset?: number;

  order?:
    | "newest"
    | "oldest";
};

/*
 * ============================================================
 * INTERNAL HELPERS
 * ============================================================
 */

function cleanRequiredText(
  value: unknown,
  fieldName: string
): string {
  const cleaned =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required for the RoyalOS tools database.`
    );
  }

  return cleaned;
}

function cleanOptionalText(
  value: unknown
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    undefined;
}

function removeUndefinedValues(
  value:
    Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(
      value
    ).filter(
      ([, item]) =>
        item !== undefined
    )
  );
}

function normalizeLimit(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 25;
  }

  return Math.min(
    100,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

function normalizeOffset(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value)
  );
}

function normalizeAttemptCount(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.floor(value)
    )
  );
}

function sanitizeJsonValue(
  value:
    RoyalOSJsonValue |
    undefined
):
  | RoyalOSJsonValue
  | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      (item) =>
        sanitizeJsonValue(
          item
        ) ?? null
    );
  }

  const sanitized:
    RoyalOSJsonObject = {};

  for (
    const [
      key,
      item,
    ] of Object.entries(
      value
    )
  ) {
    const preparedItem =
      sanitizeJsonValue(
        item
      );

    if (
      preparedItem !==
      undefined
    ) {
      sanitized[key] =
        preparedItem;
    }
  }

  return sanitized;
}

function sanitizeJsonObject(
  value:
    RoyalOSJsonObject |
    undefined
): RoyalOSJsonObject {
  if (!value) {
    return {};
  }

  return (
    sanitizeJsonValue(
      value
    ) as
      RoyalOSJsonObject
  );
}

function createDatabaseError(
  operation: string,
  error: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  }
): Error {
  const details = [
    error.message,
    error.details,
    error.hint,
    error.code
      ? `Code: ${error.code}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return new Error(
    `RoyalOS could not ${operation}. ${details}`.trim()
  );
}

/*
 * ============================================================
 * TOOL ACTIONS
 * ============================================================
 */

export async function createRoyalOSToolAction(
  input:
    CreateRoyalOSToolActionInput
): Promise<RoyalOSToolActionRecord> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const actionId =
    cleanRequiredText(
      input.actionId,
      "Action ID"
    );

  const record =
    removeUndefinedValues({
      action_id:
        actionId,

      mission_id:
        cleanOptionalText(
          input.missionId
        ) ??
        null,

      tool_id:
        cleanRequiredText(
          input.toolId,
          "Tool ID"
        ),

      action:
        cleanRequiredText(
          input.action,
          "Tool action"
        ),

      employee:
        input.employee,

      requested_by:
        input.requestedBy,

      workspace:
        input.workspace,

      status:
        input.status ??
        "requested",

      risk_level:
        input.riskLevel ??
        "low",

      requires_ceo_approval:
        input.requiresCEOApproval ??
        false,

      approval_id:
        cleanOptionalText(
          input.approvalId
        ) ??
        null,

      input:
        sanitizeJsonObject(
          input.input
        ),

      output:
        sanitizeJsonValue(
          input.output
        ) ??
        null,

      error_message:
        cleanOptionalText(
          input.errorMessage
        ) ??
        null,

      error_code:
        cleanOptionalText(
          input.errorCode
        ) ??
        null,

      external_id:
        cleanOptionalText(
          input.externalId
        ) ??
        null,

      external_url:
        cleanOptionalText(
          input.externalUrl
        ) ??
        null,

      attempt_count:
        normalizeAttemptCount(
          input.attemptCount
        ),

      started_at:
        input.startedAt,

      completed_at:
        input.completedAt,

      duration_ms:
        input.durationMs,

      metadata:
        sanitizeJsonObject(
          input.metadata
        ),
    });

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_ACTIONS_TABLE
      )
      .insert(record)
      .select("*")
      .single();

  if (error) {
    throw createDatabaseError(
      `create tool action "${actionId}"`,
      error
    );
  }

  return data as
    RoyalOSToolActionRecord;
}

export async function updateRoyalOSToolAction(
  actionId: string,
  update:
    UpdateRoyalOSToolActionInput
): Promise<RoyalOSToolActionRecord> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedActionId =
    cleanRequiredText(
      actionId,
      "Action ID"
    );

  const record =
    removeUndefinedValues({
      status:
        update.status,

      risk_level:
        update.riskLevel,

      requires_ceo_approval:
        update.requiresCEOApproval,

      approval_id:
        update.approvalId,

      output:
        update.output ===
        undefined
          ? undefined
          : update.output ===
              null
            ? null
            : sanitizeJsonValue(
                update.output
              ),

      error_message:
        update.errorMessage,

      error_code:
        update.errorCode,

      external_id:
        update.externalId,

      external_url:
        update.externalUrl,

      attempt_count:
        update.attemptCount ===
        undefined
          ? undefined
          : normalizeAttemptCount(
              update.attemptCount
            ),

      started_at:
        update.startedAt,

      completed_at:
        update.completedAt,

      duration_ms:
        update.durationMs,

      metadata:
        update.metadata ===
        undefined
          ? undefined
          : sanitizeJsonObject(
              update.metadata
            ),
    });

  if (
    Object.keys(record)
      .length === 0
  ) {
    const existing =
      await getRoyalOSToolAction(
        cleanedActionId
      );

    if (!existing) {
      throw new Error(
        `RoyalOS tool action "${cleanedActionId}" was not found.`
      );
    }

    return existing;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_ACTIONS_TABLE
      )
      .update(record)
      .eq(
        "action_id",
        cleanedActionId
      )
      .select("*")
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `update tool action "${cleanedActionId}"`,
      error
    );
  }

  if (!data) {
    throw new Error(
      `RoyalOS tool action "${cleanedActionId}" was not found.`
    );
  }

  return data as
    RoyalOSToolActionRecord;
}

export async function getRoyalOSToolAction(
  actionId: string
): Promise<
  RoyalOSToolActionRecord |
  null
> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedActionId =
    cleanRequiredText(
      actionId,
      "Action ID"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_ACTIONS_TABLE
      )
      .select("*")
      .eq(
        "action_id",
        cleanedActionId
      )
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `retrieve tool action "${cleanedActionId}"`,
      error
    );
  }

  return data
    ? data as
        RoyalOSToolActionRecord
    : null;
}

export async function listRoyalOSToolActions(
  filters:
    RoyalOSToolActionFilters = {}
): Promise<{
  actions:
    RoyalOSToolActionRecord[];

  count: number;

  limit: number;

  offset: number;
}> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const limit =
    normalizeLimit(
      filters.limit
    );

  const offset =
    normalizeOffset(
      filters.offset
    );

  let query =
    supabase
      .from(
        TOOL_ACTIONS_TABLE
      )
      .select(
        "*",
        {
          count:
            "exact",
        }
      );

  if (filters.missionId) {
    query =
      query.eq(
        "mission_id",
        filters.missionId
      );
  }

  if (filters.toolId) {
    query =
      query.eq(
        "tool_id",
        filters.toolId
      );
  }

  if (filters.employee) {
    query =
      query.eq(
        "employee",
        filters.employee
      );
  }

  if (filters.workspace) {
    query =
      query.eq(
        "workspace",
        filters.workspace
      );
  }

  if (filters.status) {
    const statuses =
      Array.isArray(
        filters.status
      )
        ? filters.status
        : [
            filters.status,
          ];

    query =
      statuses.length === 1
        ? query.eq(
            "status",
            statuses[0]
          )
        : query.in(
            "status",
            statuses
          );
  }

  const {
    data,
    error,
    count,
  } =
    await query
      .order(
        "created_at",
        {
          ascending:
            filters.order ===
            "oldest",
        }
      )
      .range(
        offset,
        offset +
          limit -
          1
      );

  if (error) {
    throw createDatabaseError(
      "list tool actions",
      error
    );
  }

  return {
    actions:
      (
        data ??
        []
      ) as
        RoyalOSToolActionRecord[],

    count:
      count ??
      0,

    limit,

    offset,
  };
}

/*
 * ============================================================
 * TOOL APPROVALS
 * ============================================================
 */

export async function createRoyalOSToolApproval(
  input:
    CreateRoyalOSToolApprovalInput
): Promise<RoyalOSToolApprovalRecord> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const approvalId =
    cleanRequiredText(
      input.approvalId,
      "Approval ID"
    );

  const actionId =
    cleanRequiredText(
      input.actionId,
      "Action ID"
    );

  const record = {
    approval_id:
      approvalId,

    action_id:
      actionId,

    mission_id:
      cleanOptionalText(
        input.missionId
      ) ??
      null,

    tool_id:
      cleanRequiredText(
        input.toolId,
        "Tool ID"
      ),

    action:
      cleanRequiredText(
        input.action,
        "Tool action"
      ),

    employee:
      input.employee,

    workspace:
      input.workspace,

    risk_level:
      input.riskLevel,

    summary:
      cleanRequiredText(
        input.summary,
        "Approval summary"
      ),

    input_preview:
      sanitizeJsonObject(
        input.inputPreview
      ),

    status:
      "pending",

    expires_at:
      input.expiresAt ??
      null,
  };

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_APPROVALS_TABLE
      )
      .insert(record)
      .select("*")
      .single();

  if (error) {
    throw createDatabaseError(
      `create tool approval "${approvalId}"`,
      error
    );
  }

  await updateRoyalOSToolAction(
    actionId,
    {
      status:
        "awaiting_approval",

      approvalId,

      requiresCEOApproval:
        true,
    }
  );

  return data as
    RoyalOSToolApprovalRecord;
}

export async function getRoyalOSToolApproval(
  approvalId: string
): Promise<
  RoyalOSToolApprovalRecord |
  null
> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedApprovalId =
    cleanRequiredText(
      approvalId,
      "Approval ID"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_APPROVALS_TABLE
      )
      .select("*")
      .eq(
        "approval_id",
        cleanedApprovalId
      )
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `retrieve approval "${cleanedApprovalId}"`,
      error
    );
  }

  return data
    ? data as
        RoyalOSToolApprovalRecord
    : null;
}

export async function decideRoyalOSToolApproval(
  approvalId: string,
  input:
    DecideRoyalOSToolApprovalInput
): Promise<RoyalOSToolApprovalRecord> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedApprovalId =
    cleanRequiredText(
      approvalId,
      "Approval ID"
    );

  const decidedBy =
    cleanRequiredText(
      input.decidedBy,
      "Approval decision maker"
    );

  const decidedAt =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_APPROVALS_TABLE
      )
      .update({
        status:
          input.decision,

        decided_by:
          decidedBy,

        decision_note:
          cleanOptionalText(
            input.decisionNote
          ) ??
          null,

        decided_at:
          decidedAt,
      })
      .eq(
        "approval_id",
        cleanedApprovalId
      )
      .select("*")
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `decide approval "${cleanedApprovalId}"`,
      error
    );
  }

  if (!data) {
    throw new Error(
      `RoyalOS tool approval "${cleanedApprovalId}" was not found.`
    );
  }

  const approval =
    data as
      RoyalOSToolApprovalRecord;

  const actionStatus:
    RoyalOSToolActionStatus =
      input.decision ===
      "approved"
        ? "approved"
        : input.decision ===
            "rejected"
          ? "rejected"
          : "awaiting_approval";

  await updateRoyalOSToolAction(
    approval.action_id,
    {
      status:
        actionStatus,
    }
  );

  return approval;
}

export async function listRoyalOSToolApprovals(
  filters:
    RoyalOSToolApprovalFilters = {}
): Promise<{
  approvals:
    RoyalOSToolApprovalRecord[];

  count: number;

  limit: number;

  offset: number;
}> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const limit =
    normalizeLimit(
      filters.limit
    );

  const offset =
    normalizeOffset(
      filters.offset
    );

  let query =
    supabase
      .from(
        TOOL_APPROVALS_TABLE
      )
      .select(
        "*",
        {
          count:
            "exact",
        }
      );

  if (filters.missionId) {
    query =
      query.eq(
        "mission_id",
        filters.missionId
      );
  }

  if (filters.actionId) {
    query =
      query.eq(
        "action_id",
        filters.actionId
      );
  }

  if (filters.employee) {
    query =
      query.eq(
        "employee",
        filters.employee
      );
  }

  if (filters.workspace) {
    query =
      query.eq(
        "workspace",
        filters.workspace
      );
  }

  if (filters.status) {
    const statuses =
      Array.isArray(
        filters.status
      )
        ? filters.status
        : [
            filters.status,
          ];

    query =
      statuses.length === 1
        ? query.eq(
            "status",
            statuses[0]
          )
        : query.in(
            "status",
            statuses
          );
  }

  const {
    data,
    error,
    count,
  } =
    await query
      .order(
        "requested_at",
        {
          ascending:
            filters.order ===
            "oldest",
        }
      )
      .range(
        offset,
        offset +
          limit -
          1
      );

  if (error) {
    throw createDatabaseError(
      "list tool approvals",
      error
    );
  }

  return {
    approvals:
      (
        data ??
        []
      ) as
        RoyalOSToolApprovalRecord[],

    count:
      count ??
      0,

    limit,

    offset,
  };
}

/*
 * ============================================================
 * TOOL CONNECTIONS
 * ============================================================
 */

export async function getRoyalOSToolConnection(
  connectionKey: string
): Promise<
  RoyalOSToolConnectionRecord |
  null
> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedConnectionKey =
    cleanRequiredText(
      connectionKey,
      "Connection key"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_CONNECTIONS_TABLE
      )
      .select("*")
      .eq(
        "connection_key",
        cleanedConnectionKey
      )
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `retrieve connection "${cleanedConnectionKey}"`,
      error
    );
  }

  return data
    ? data as
        RoyalOSToolConnectionRecord
    : null;
}

export async function listRoyalOSToolConnections(
  filters: {
    provider?:
      RoyalOSToolProvider;

    workspace?:
      RoyalOSWorkspace;

    status?:
      RoyalOSToolConnectionStatus;

    enabled?: boolean;
  } = {}
): Promise<
  RoyalOSToolConnectionRecord[]
> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  let query =
    supabase
      .from(
        TOOL_CONNECTIONS_TABLE
      )
      .select("*");

  if (filters.provider) {
    query =
      query.eq(
        "provider",
        filters.provider
      );
  }

  if (filters.workspace) {
    query =
      query.eq(
        "workspace",
        filters.workspace
      );
  }

  if (filters.status) {
    query =
      query.eq(
        "status",
        filters.status
      );
  }

  if (
    typeof filters.enabled ===
    "boolean"
  ) {
    query =
      query.eq(
        "enabled",
        filters.enabled
      );
  }

  const {
    data,
    error,
  } =
    await query.order(
      "display_name",
      {
        ascending:
          true,
      }
    );

  if (error) {
    throw createDatabaseError(
      "list tool connections",
      error
    );
  }

  return (
    data ??
    []
  ) as
    RoyalOSToolConnectionRecord[];
}

export async function updateRoyalOSToolConnection(
  connectionKey: string,
  update: {
    status?:
      RoyalOSToolConnectionStatus;

    accountName?:
      string | null;

    accountId?:
      string | null;

    connectedBy?:
      string | null;

    connectedAt?:
      string | null;

    lastTestedAt?:
      string | null;

    lastSuccessAt?:
      string | null;

    lastError?:
      string | null;

    enabled?:
      boolean;

    configuration?:
      RoyalOSJsonObject;

    metadata?:
      RoyalOSJsonObject;
  }
): Promise<RoyalOSToolConnectionRecord> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedConnectionKey =
    cleanRequiredText(
      connectionKey,
      "Connection key"
    );

  const record =
    removeUndefinedValues({
      status:
        update.status,

      account_name:
        update.accountName,

      account_id:
        update.accountId,

      connected_by:
        update.connectedBy,

      connected_at:
        update.connectedAt,

      last_tested_at:
        update.lastTestedAt,

      last_success_at:
        update.lastSuccessAt,

      last_error:
        update.lastError,

      enabled:
        update.enabled,

      configuration:
        update.configuration ===
        undefined
          ? undefined
          : sanitizeJsonObject(
              update.configuration
            ),

      metadata:
        update.metadata ===
        undefined
          ? undefined
          : sanitizeJsonObject(
              update.metadata
            ),
    });

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TOOL_CONNECTIONS_TABLE
      )
      .update(record)
      .eq(
        "connection_key",
        cleanedConnectionKey
      )
      .select("*")
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `update connection "${cleanedConnectionKey}"`,
      error
    );
  }

  if (!data) {
    throw new Error(
      `RoyalOS tool connection "${cleanedConnectionKey}" was not found.`
    );
  }

  return data as
    RoyalOSToolConnectionRecord;
}

/*
 * ============================================================
 * ASSETS
 * ============================================================
 */

export async function createRoyalOSAsset(
  input:
    CreateRoyalOSAssetInput
): Promise<RoyalOSAssetRecord> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const assetId =
    cleanRequiredText(
      input.assetId,
      "Asset ID"
    );

  const record = {
    asset_id:
      assetId,

    mission_id:
      cleanOptionalText(
        input.missionId
      ) ??
      null,

    action_id:
      cleanOptionalText(
        input.actionId
      ) ??
      null,

    workspace:
      input.workspace,

    created_by_employee:
      input.createdByEmployee,

    asset_type:
      input.assetType,

    provider:
      input.provider,

    status:
      input.status ??
      "processing",

    title:
      cleanRequiredText(
        input.title,
        "Asset title"
      ),

    description:
      cleanOptionalText(
        input.description
      ) ??
      null,

    prompt:
      cleanOptionalText(
        input.prompt
      ) ??
      null,

    revised_prompt:
      cleanOptionalText(
        input.revisedPrompt
      ) ??
      null,

    storage_bucket:
      cleanOptionalText(
        input.storageBucket
      ) ??
      ASSET_BUCKET,

    storage_path:
      cleanOptionalText(
        input.storagePath
      ) ??
      null,

    public_url:
      cleanOptionalText(
        input.publicUrl
      ) ??
      null,

    mime_type:
      cleanOptionalText(
        input.mimeType
      ) ??
      null,

    width:
      input.width ??
      null,

    height:
      input.height ??
      null,

    size_bytes:
      input.sizeBytes ??
      null,

    approval_status:
      input.approvalStatus ??
      "pending",

    approved_by:
      cleanOptionalText(
        input.approvedBy
      ) ??
      null,

    approved_at:
      input.approvedAt ??
      null,

    metadata:
      sanitizeJsonObject(
        input.metadata
      ),
  };

  const {
    data,
    error,
  } =
    await supabase
      .from(
        ASSETS_TABLE
      )
      .insert(record)
      .select("*")
      .single();

  if (error) {
    throw createDatabaseError(
      `create asset "${assetId}"`,
      error
    );
  }

  return data as
    RoyalOSAssetRecord;
}

export async function updateRoyalOSAsset(
  assetId: string,
  update:
    UpdateRoyalOSAssetInput
): Promise<RoyalOSAssetRecord> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedAssetId =
    cleanRequiredText(
      assetId,
      "Asset ID"
    );

  const record =
    removeUndefinedValues({
      status:
        update.status,

      title:
        update.title,

      description:
        update.description,

      prompt:
        update.prompt,

      revised_prompt:
        update.revisedPrompt,

      storage_bucket:
        update.storageBucket,

      storage_path:
        update.storagePath,

      public_url:
        update.publicUrl,

      mime_type:
        update.mimeType,

      width:
        update.width,

      height:
        update.height,

      size_bytes:
        update.sizeBytes,

      approval_status:
        update.approvalStatus,

      approved_by:
        update.approvedBy,

      approved_at:
        update.approvedAt,

      metadata:
        update.metadata ===
        undefined
          ? undefined
          : sanitizeJsonObject(
              update.metadata
            ),
    });

  const {
    data,
    error,
  } =
    await supabase
      .from(
        ASSETS_TABLE
      )
      .update(record)
      .eq(
        "asset_id",
        cleanedAssetId
      )
      .select("*")
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `update asset "${cleanedAssetId}"`,
      error
    );
  }

  if (!data) {
    throw new Error(
      `RoyalOS asset "${cleanedAssetId}" was not found.`
    );
  }

  return data as
    RoyalOSAssetRecord;
}

export async function getRoyalOSAsset(
  assetId: string
): Promise<
  RoyalOSAssetRecord |
  null
> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const cleanedAssetId =
    cleanRequiredText(
      assetId,
      "Asset ID"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        ASSETS_TABLE
      )
      .select("*")
      .eq(
        "asset_id",
        cleanedAssetId
      )
      .maybeSingle();

  if (error) {
    throw createDatabaseError(
      `retrieve asset "${cleanedAssetId}"`,
      error
    );
  }

  return data
    ? data as
        RoyalOSAssetRecord
    : null;
}

export async function listRoyalOSAssets(
  filters:
    RoyalOSAssetFilters = {}
): Promise<{
  assets:
    RoyalOSAssetRecord[];

  count: number;

  limit: number;

  offset: number;
}> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const limit =
    normalizeLimit(
      filters.limit
    );

  const offset =
    normalizeOffset(
      filters.offset
    );

  let query =
    supabase
      .from(
        ASSETS_TABLE
      )
      .select(
        "*",
        {
          count:
            "exact",
        }
      );

  if (filters.missionId) {
    query =
      query.eq(
        "mission_id",
        filters.missionId
      );
  }

  if (filters.actionId) {
    query =
      query.eq(
        "action_id",
        filters.actionId
      );
  }

  if (filters.employee) {
    query =
      query.eq(
        "created_by_employee",
        filters.employee
      );
  }

  if (filters.workspace) {
    query =
      query.eq(
        "workspace",
        filters.workspace
      );
  }

  if (filters.assetType) {
    query =
      query.eq(
        "asset_type",
        filters.assetType
      );
  }

  if (filters.status) {
    query =
      query.eq(
        "status",
        filters.status
      );
  }

  if (
    filters.approvalStatus
  ) {
    query =
      query.eq(
        "approval_status",
        filters.approvalStatus
      );
  }

  const {
    data,
    error,
    count,
  } =
    await query
      .order(
        "created_at",
        {
          ascending:
            filters.order ===
            "oldest",
        }
      )
      .range(
        offset,
        offset +
          limit -
          1
      );

  if (error) {
    throw createDatabaseError(
      "list RoyalOS assets",
      error
    );
  }

  return {
    assets:
      (
        data ??
        []
      ) as
        RoyalOSAssetRecord[],

    count:
      count ??
      0,

    limit,

    offset,
  };
}

/*
 * ============================================================
 * ASSET STORAGE
 * ============================================================
 */

export async function uploadRoyalOSAssetFile(
  input: {
    storagePath: string;

    file:
      Uint8Array |
      ArrayBuffer |
      Blob;

    mimeType: string;

    bucket?: string;

    upsert?: boolean;
  }
): Promise<{
  bucket: string;

  storagePath: string;
}> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const bucket =
    cleanOptionalText(
      input.bucket
    ) ??
    ASSET_BUCKET;

  const storagePath =
    cleanRequiredText(
      input.storagePath,
      "Asset storage path"
    );

  const mimeType =
    cleanRequiredText(
      input.mimeType,
      "Asset MIME type"
    );

  const {
    error,
  } =
    await supabase
      .storage
      .from(bucket)
      .upload(
        storagePath,
        input.file,
        {
          contentType:
            mimeType,

          upsert:
            input.upsert ??
            false,

          cacheControl:
            "3600",
        }
      );

  if (error) {
    throw new Error(
      `RoyalOS could not upload asset "${storagePath}": ${error.message}`
    );
  }

  return {
    bucket,
    storagePath,
  };
}

export async function createRoyalOSAssetSignedUrl(
  assetId: string,
  expiresInSeconds =
    3_600
): Promise<string> {
  const asset =
    await getRoyalOSAsset(
      assetId
    );

  if (!asset) {
    throw new Error(
      `RoyalOS asset "${assetId}" was not found.`
    );
  }

  if (
    !asset.storage_path
  ) {
    throw new Error(
      `RoyalOS asset "${assetId}" does not have a stored file path.`
    );
  }

  const supabase =
    getRoyalOSToolsSupabaseClient();

  const safeExpiration =
    Math.min(
      86_400,
      Math.max(
        60,
        Math.floor(
          expiresInSeconds
        )
      )
    );

  const {
    data,
    error,
  } =
    await supabase
      .storage
      .from(
        asset.storage_bucket
      )
      .createSignedUrl(
        asset.storage_path,
        safeExpiration
      );

  if (error) {
    throw new Error(
      `RoyalOS could not create an asset access link: ${error.message}`
    );
  }

  return data.signedUrl;
}

/*
 * ============================================================
 * PERMANENT AUDIT STORAGE
 * ============================================================
 */

export async function saveRoyalOSToolAuditEvent(
  event:
    RoyalOSToolAuditEvent
): Promise<void> {
  const supabase =
    getRoyalOSToolsSupabaseClient();

  const record = {
    event_id:
      cleanRequiredText(
        event.eventId,
        "Audit event ID"
      ),

    event_type:
      event.eventType,

    action_id:
      cleanOptionalText(
        event.actionId
      ) ??
      null,

    mission_id:
      cleanOptionalText(
        event.missionId
      ) ??
      null,

    tool_id:
      cleanOptionalText(
        event.toolId
      ) ??
      null,

    employee:
      event.employee ??
      null,

    workspace:
      event.workspace ??
      null,

    message:
      cleanRequiredText(
        event.message,
        "Audit message"
      ),

    event_timestamp:
      event.timestamp,

    details:
      sanitizeJsonObject(
        event.details
      ),
  };

  const {
    error,
  } =
    await supabase
      .from(
        TOOL_AUDIT_TABLE
      )
      .upsert(
        record,
        {
          onConflict:
            "event_id",

          ignoreDuplicates:
            true,
        }
      );

  if (error) {
    throw createDatabaseError(
      `save audit event "${event.eventId}"`,
      error
    );
  }
}