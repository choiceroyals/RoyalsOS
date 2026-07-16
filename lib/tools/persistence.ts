import "server-only";

import {
  createRoyalOSToolAction,
  createRoyalOSToolApproval,
  getRoyalOSToolAction,
  listRoyalOSToolApprovals,
  saveRoyalOSToolAuditEvent,
  updateRoyalOSToolAction,
  type RoyalOSToolApprovalRecord,
} from "@/lib/tools/database";

import type {
  RoyalOSToolActionRecord,
  RoyalOSToolAuditEvent,
  RoyalOSToolDefinition,
  RoyalOSToolExecutionRequest,
  RoyalOSToolExecutionResult,
  RoyalOSToolPermissionDecision,
} from "@/lib/tools/types";

import type {
  RoyalOSJsonObject,
  RoyalOSJsonValue,
} from "@/lib/missions/types";

/*
 * ============================================================
 * PERSISTENCE RESULT
 * ============================================================
 */

export type RoyalOSToolPersistenceResult<
  TValue,
> = {
  saved: boolean;

  value:
    TValue | null;

  error:
    string | null;
};

/*
 * ============================================================
 * INTERNAL HELPERS
 * ============================================================
 */

function createIdentifier(
  prefix: string
): string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID === "function"
  ) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

export function createRoyalOSToolApprovalId():
  string {
  return createIdentifier(
    "approval"
  );
}

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unknown RoyalOS tool-persistence error.";
}

function getAttemptNumber(
  metadata:
    RoyalOSJsonObject |
    undefined
): number | undefined {
  const attempt =
    metadata?.attempt;

  if (
    typeof attempt !==
      "number" ||
    !Number.isFinite(
      attempt
    )
  ) {
    return undefined;
  }

  return Math.max(
    0,
    Math.floor(attempt)
  );
}

function createRequestMetadata(
  definition:
    RoyalOSToolDefinition,
  request:
    RoyalOSToolExecutionRequest,
  permission:
    RoyalOSToolPermissionDecision
): RoyalOSJsonObject {
  return {
    toolName:
      definition.name,

    toolVersion:
      definition.version,

    provider:
      definition.provider,

    category:
      definition.category,

    capability:
      request.action,

    mode:
      request.context.mode,

    requestedAt:
      request.context
        .requestTimestamp,

    permissionAllowed:
      permission.allowed,

    permissionReason:
      permission.reason,

    permissionRequiresApproval:
      permission
        .requiresApproval,

    registeredApprovalPolicy:
      definition
        .approvalPolicy,

    connectionKey:
      definition
        .connectionKey ??
      null,
  };
}

/*
 * ============================================================
 * SAVE TOOL ACTION REQUEST
 * ============================================================
 */

export async function persistRoyalOSToolActionRequest(
  input: {
    definition:
      RoyalOSToolDefinition;

    request:
      RoyalOSToolExecutionRequest;

    permission:
      RoyalOSToolPermissionDecision;
  }
): Promise<RoyalOSToolActionRecord> {
  const {
    definition,
    request,
    permission,
  } = input;

  const actionId =
    request.context.actionId;

  const existing =
    await getRoyalOSToolAction(
      actionId
    );

  if (existing) {
    return updateRoyalOSToolAction(
      actionId,
      {
        status:
          permission.allowed
            ? permission
                .requiresApproval ||
              request.context
                .requiresCEOApproval
              ? "awaiting_approval"
              : "validating"
            : "rejected",

        riskLevel:
          permission.riskLevel,

        requiresCEOApproval:
          permission
            .requiresApproval ||
          request.context
            .requiresCEOApproval,

        errorMessage:
          permission.allowed
            ? null
            : permission.reason,

        errorCode:
          permission.allowed
            ? null
            : "TOOL_PERMISSION_DENIED",

        metadata:
          createRequestMetadata(
            definition,
            request,
            permission
          ),
      }
    );
  }

  return createRoyalOSToolAction({
    actionId,

    missionId:
      request.context
        .missionId,

    toolId:
      definition.id,

    action:
      request.action,

    employee:
      request.context
        .employee,

    requestedBy:
      request.context
        .requestedBy,

    workspace:
      request.context
        .workspace,

    status:
      permission.allowed
        ? permission
            .requiresApproval ||
          request.context
            .requiresCEOApproval
          ? "awaiting_approval"
          : "validating"
        : "rejected",

    riskLevel:
      permission.riskLevel,

    requiresCEOApproval:
      permission
        .requiresApproval ||
      request.context
        .requiresCEOApproval,

    input:
      request.input,

    errorMessage:
      permission.allowed
        ? undefined
        : permission.reason,

    errorCode:
      permission.allowed
        ? undefined
        : "TOOL_PERMISSION_DENIED",

    metadata:
      createRequestMetadata(
        definition,
        request,
        permission
      ),
  });
}

export async function persistRoyalOSToolActionRequestSafely(
  input: {
    definition:
      RoyalOSToolDefinition;

    request:
      RoyalOSToolExecutionRequest;

    permission:
      RoyalOSToolPermissionDecision;
  }
): Promise<
  RoyalOSToolPersistenceResult<
    RoyalOSToolActionRecord
  >
> {
  try {
    const action =
      await persistRoyalOSToolActionRequest(
        input
      );

    return {
      saved:
        true,

      value:
        action,

      error:
        null,
    };
  } catch (error) {
    const message =
      getErrorMessage(
        error
      );

    console.error(
      "RoyalOS could not persist the tool action request:",
      error
    );

    return {
      saved:
        false,

      value:
        null,

      error:
        message,
    };
  }
}

/*
 * ============================================================
 * SAVE APPROVAL REQUEST
 * ============================================================
 */

export async function persistRoyalOSToolApprovalRequest(
  input: {
    definition:
      RoyalOSToolDefinition;

    request:
      RoyalOSToolExecutionRequest;

    permission:
      RoyalOSToolPermissionDecision;

    summary?: string;

    expiresInHours?: number;
  }
): Promise<RoyalOSToolApprovalRecord> {
  const {
    definition,
    request,
    permission,
  } = input;

  const existingApprovals =
    await listRoyalOSToolApprovals({
      actionId:
        request.context
          .actionId,

      status:
        "pending",

      limit:
        1,
    });

  const existing =
    existingApprovals
      .approvals[0];

  if (existing) {
    return existing;
  }

  const expirationHours =
    typeof input
      .expiresInHours ===
      "number" &&
    Number.isFinite(
      input.expiresInHours
    )
      ? Math.min(
          168,
          Math.max(
            1,
            Math.floor(
              input.expiresInHours
            )
          )
        )
      : 72;

  const expiresAt =
    new Date(
      Date.now() +
        expirationHours *
          60 *
          60 *
          1_000
    ).toISOString();

  return createRoyalOSToolApproval({
    approvalId:
      createRoyalOSToolApprovalId(),

    actionId:
      request.context
        .actionId,

    missionId:
      request.context
        .missionId,

    toolId:
      definition.id,

    action:
      request.action,

    employee:
      request.context
        .employee,

    workspace:
      request.context
        .workspace,

    riskLevel:
      permission.riskLevel,

    summary:
      input.summary?.trim() ||
      `${request.context.employee} requests permission to use ${definition.name} for ${request.action}.`,

    inputPreview:
      request.input,

    expiresAt,
  });
}

export async function persistRoyalOSToolApprovalRequestSafely(
  input: {
    definition:
      RoyalOSToolDefinition;

    request:
      RoyalOSToolExecutionRequest;

    permission:
      RoyalOSToolPermissionDecision;

    summary?: string;

    expiresInHours?: number;
  }
): Promise<
  RoyalOSToolPersistenceResult<
    RoyalOSToolApprovalRecord
  >
> {
  try {
    const approval =
      await persistRoyalOSToolApprovalRequest(
        input
      );

    return {
      saved:
        true,

      value:
        approval,

      error:
        null,
    };
  } catch (error) {
    const message =
      getErrorMessage(
        error
      );

    console.error(
      "RoyalOS could not persist the tool approval request:",
      error
    );

    return {
      saved:
        false,

      value:
        null,

      error:
        message,
    };
  }
}

/*
 * ============================================================
 * SAVE EXECUTION RESULT
 * ============================================================
 */

export async function persistRoyalOSToolExecutionResult<
  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
>(
  result:
    RoyalOSToolExecutionResult<TOutput>
): Promise<RoyalOSToolActionRecord> {
  const existing =
    await getRoyalOSToolAction(
      result.actionId
    );

  if (!existing) {
    throw new Error(
      `RoyalOS cannot save the result because tool action "${result.actionId}" does not exist.`
    );
  }

  const resultMetadata:
    RoyalOSJsonObject = {
      ...(
        result.metadata ??
        {}
      ),

      persistenceUpdatedAt:
        new Date()
          .toISOString(),
  };

  return updateRoyalOSToolAction(
    result.actionId,
    {
      status:
        result.status,

      output:
        result.output ===
        undefined
          ? null
          : result.output,

      errorMessage:
        result.error ??
        null,

      errorCode:
        result.errorCode ??
        null,

      externalId:
        result.externalId ??
        null,

      externalUrl:
        result.externalUrl ??
        null,

      attemptCount:
        getAttemptNumber(
          result.metadata
        ),

      startedAt:
        result.startedAt,

      completedAt:
        result.completedAt,

      durationMs:
        result.durationMs,

      metadata:
        resultMetadata,
    }
  );
}

export async function persistRoyalOSToolExecutionResultSafely<
  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
>(
  result:
    RoyalOSToolExecutionResult<TOutput>
): Promise<
  RoyalOSToolPersistenceResult<
    RoyalOSToolActionRecord
  >
> {
  try {
    const action =
      await persistRoyalOSToolExecutionResult(
        result
      );

    return {
      saved:
        true,

      value:
        action,

      error:
        null,
    };
  } catch (error) {
    const message =
      getErrorMessage(
        error
      );

    console.error(
      "RoyalOS could not persist the tool execution result:",
      error
    );

    return {
      saved:
        false,

      value:
        null,

      error:
        message,
    };
  }
}

/*
 * ============================================================
 * SAVE PERMANENT AUDIT EVENT
 * ============================================================
 */

export async function persistRoyalOSToolAuditEvent(
  event:
    RoyalOSToolAuditEvent
): Promise<void> {
  await saveRoyalOSToolAuditEvent(
    event
  );
}

export async function persistRoyalOSToolAuditEventSafely(
  event:
    RoyalOSToolAuditEvent
): Promise<
  RoyalOSToolPersistenceResult<void>
> {
  try {
    await persistRoyalOSToolAuditEvent(
      event
    );

    return {
      saved:
        true,

      value:
        undefined,
      
      error:
        null,
    };
  } catch (error) {
    const message =
      getErrorMessage(
        error
      );

    console.error(
      "RoyalOS could not save the permanent tool audit event:",
      error
    );

    return {
      saved:
        false,

      value:
        null,

      error:
        message,
    };
  }
}