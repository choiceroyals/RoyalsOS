import "server-only";

import {
  requireRoyalOSToolRegistration,
} from "@/lib/tools/registry";

import {
  evaluateRoyalOSToolPermission,
} from "@/lib/tools/permissions";

import {
  auditRoyalOSToolApprovalRequested,
  auditRoyalOSToolFailed,
  auditRoyalOSToolRequested,
  auditRoyalOSToolStarted,
  auditRoyalOSToolSucceeded,
  recordRoyalOSToolAuditEvent,
} from "@/lib/tools/audit";

import {
  persistRoyalOSToolActionRequestSafely,
  persistRoyalOSToolApprovalRequestSafely,
  persistRoyalOSToolAuditEventSafely,
  persistRoyalOSToolExecutionResultSafely,
} from "@/lib/tools/persistence";

import {
  isRoyalOSToolCapability,
  type RoyalOSToolAuditEvent,
  type RoyalOSToolCapability,
  type RoyalOSToolExecutionRequest,
  type RoyalOSToolExecutionResult,
  type RoyalOSToolPermissionDecision,
  type RoyalOSToolRequester,
} from "@/lib/tools/types";

import {
  isRoyalOSEmployeeName,
  isRoyalOSMissionMode,
  isRoyalOSWorkspace,
  type RoyalOSJsonObject,
  type RoyalOSJsonValue,
} from "@/lib/missions/types";

/*
 * ============================================================
 * EXECUTOR OPTIONS
 * ============================================================
 */

export type ExecuteRoyalOSToolOptions = {
  capability?:
    RoyalOSToolCapability;

  maximumAttempts?:
    number;

  retryDelayMs?:
    number;
};

/*
 * ============================================================
 * EXECUTION ERRORS
 * ============================================================
 */

class RoyalOSToolTimeoutError extends Error {
  readonly code =
    "TOOL_EXECUTION_TIMEOUT";

  constructor(
    toolId: string,
    timeoutMs: number
  ) {
    super(
      `RoyalOS tool "${toolId}" exceeded its ${timeoutMs} millisecond execution limit.`
    );

    this.name =
      "RoyalOSToolTimeoutError";
  }
}

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
      `${fieldName} is required to execute a RoyalOS tool.`
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

export function createRoyalOSToolActionId():
  string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID === "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return `tool_action_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function isJsonObject(
  value: unknown
): value is RoyalOSJsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidRequester(
  value: unknown
): value is RoyalOSToolRequester {
  return (
    value === "CEO" ||
    value === "system" ||
    isRoyalOSEmployeeName(
      value
    )
  );
}

function normalizeAttempts(
  requestedAttempts:
    number | undefined,
  toolMaximumAttempts:
    number
): number {
  if (
    typeof requestedAttempts !==
      "number" ||
    !Number.isFinite(
      requestedAttempts
    )
  ) {
    return toolMaximumAttempts;
  }

  return Math.min(
    toolMaximumAttempts,
    Math.max(
      1,
      Math.floor(
        requestedAttempts
      )
    )
  );
}

function normalizeRetryDelay(
  value:
    number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 500;
  }

  return Math.min(
    10_000,
    Math.max(
      0,
      Math.floor(value)
    )
  );
}

function delay(
  durationMs: number
): Promise<void> {
  if (
    durationMs <= 0
  ) {
    return Promise.resolve();
  }

  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        durationMs
      );
    }
  );
}

function executeWithTimeout<
  TResult,
>(
  promise:
    Promise<TResult>,
  toolId: string,
  timeoutMs: number
): Promise<TResult> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const timeout =
        setTimeout(
          () => {
            reject(
              new RoyalOSToolTimeoutError(
                toolId,
                timeoutMs
              )
            );
          },
          timeoutMs
        );

      promise.then(
        (result) => {
          clearTimeout(
            timeout
          );

          resolve(
            result
          );
        },
        (error) => {
          clearTimeout(
            timeout
          );

          reject(
            error
          );
        }
      );
    }
  );
}

function getErrorInformation(
  error: unknown
): {
  message: string;
  code: string;
  retryable: boolean;
} {
  if (
    error instanceof
    RoyalOSToolTimeoutError
  ) {
    return {
      message:
        error.message,

      code:
        error.code,

      retryable:
        true,
    };
  }

  if (
    error instanceof Error
  ) {
    const possibleError =
      error as Error & {
        code?: string;
        retryable?: boolean;
        status?: number;
      };

    const status =
      possibleError.status;

    const retryableStatus =
      status === 408 ||
      status === 409 ||
      status === 425 ||
      status === 429 ||
      (
        typeof status ===
          "number" &&
        status >= 500
      );

    return {
      message:
        possibleError.message ||
        "Unknown RoyalOS tool execution error.",

      code:
        possibleError.code ||
        "TOOL_EXECUTION_ERROR",

      retryable:
        possibleError.retryable ??
        retryableStatus,
    };
  }

  return {
    message:
      "Unknown RoyalOS tool execution error.",

    code:
      "UNKNOWN_TOOL_ERROR",

    retryable:
      false,
  };
}

function createResult<
  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
>(
  values: {
    actionId: string;

    toolId: string;

    status:
      RoyalOSToolExecutionResult<TOutput>["status"];

    success: boolean;

    output?: TOutput;

    error?: string;

    errorCode?: string;

    retryable?: boolean;

    externalId?: string;

    externalUrl?: string;

    startedAt: string;

    completedAt: string;

    durationMs: number;

    metadata?:
      RoyalOSJsonObject;
  }
): RoyalOSToolExecutionResult<TOutput> {
  const result:
    RoyalOSToolExecutionResult<TOutput> = {
      actionId:
        values.actionId,

      toolId:
        values.toolId,

      status:
        values.status,

      success:
        values.success,

      startedAt:
        values.startedAt,

      completedAt:
        values.completedAt,

      durationMs:
        Math.max(
          0,
          Math.floor(
            values.durationMs
          )
        ),
  };

  if (
    values.output !==
    undefined
  ) {
    result.output =
      values.output;
  }

  if (values.error) {
    result.error =
      values.error;
  }

  if (
    values.errorCode
  ) {
    result.errorCode =
      values.errorCode;
  }

  if (
    typeof values.retryable ===
    "boolean"
  ) {
    result.retryable =
      values.retryable;
  }

  if (
    values.externalId
  ) {
    result.externalId =
      values.externalId;
  }

  if (
    values.externalUrl
  ) {
    result.externalUrl =
      values.externalUrl;
  }

  if (
    values.metadata
  ) {
    result.metadata =
      values.metadata;
  }

  return result;
}

function createInputSummary(
  input:
    RoyalOSJsonObject
): RoyalOSJsonObject {
  const keys =
    Object.keys(input);

  return {
    inputKeys:
      keys.slice(
        0,
        100
      ),

    inputFieldCount:
      keys.length,
  };
}

async function saveAuditEvent(
  event:
    RoyalOSToolAuditEvent
): Promise<void> {
  await persistRoyalOSToolAuditEventSafely(
    event
  );
}

async function saveExecutionResult<
  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
>(
  result:
    RoyalOSToolExecutionResult<TOutput>
): Promise<
  RoyalOSToolExecutionResult<TOutput>
> {
  await persistRoyalOSToolExecutionResultSafely(
    result
  );

  return result;
}

function createRejectedPermission(
  riskLevel:
    RoyalOSToolPermissionDecision["riskLevel"],
  reason: string
): RoyalOSToolPermissionDecision {
  return {
    allowed:
      false,

    requiresApproval:
      false,

    riskLevel,

    reason,
  };
}

/*
 * ============================================================
 * INPUT FIELD VALIDATION
 * ============================================================
 */

function validateToolInput(
  input:
    RoyalOSJsonObject,
  fields:
    ReturnType<
      typeof requireRoyalOSToolRegistration
    >["definition"]["inputFields"]
): void {
  if (
    !fields ||
    fields.length === 0
  ) {
    return;
  }

  for (
    const field of fields
  ) {
    const value =
      input[field.key];

    const missing =
      value === undefined ||
      value === null ||
      (
        typeof value ===
          "string" &&
        !value.trim()
      );

    if (
      field.required &&
      missing
    ) {
      throw new Error(
        `"${field.label}" is required for this RoyalOS tool.`
      );
    }

    if (missing) {
      continue;
    }

    if (
      field.type ===
        "number" &&
      (
        typeof value !==
          "number" ||
        !Number.isFinite(
          value
        )
      )
    ) {
      throw new Error(
        `"${field.label}" must be a valid number.`
      );
    }

    if (
      field.type ===
        "boolean" &&
      typeof value !==
        "boolean"
    ) {
      throw new Error(
        `"${field.label}" must be true or false.`
      );
    }

    if (
      (
        field.type ===
          "text" ||
        field.type ===
          "textarea" ||
        field.type ===
          "url" ||
        field.type ===
          "image" ||
        field.type ===
          "file"
      ) &&
      typeof value !==
        "string"
    ) {
      throw new Error(
        `"${field.label}" must be text.`
      );
    }

    if (
      field.type ===
        "multiselect" &&
      !Array.isArray(value)
    ) {
      throw new Error(
        `"${field.label}" must contain a list of values.`
      );
    }

    if (
      typeof value ===
        "string" &&
      field.maximumLength !==
        undefined &&
      value.length >
        field.maximumLength
    ) {
      throw new Error(
        `"${field.label}" cannot exceed ${field.maximumLength} characters.`
      );
    }

    if (
      typeof value ===
        "number" &&
      field.minimum !==
        undefined &&
      value <
        field.minimum
    ) {
      throw new Error(
        `"${field.label}" cannot be less than ${field.minimum}.`
      );
    }

    if (
      typeof value ===
        "number" &&
      field.maximum !==
        undefined &&
      value >
        field.maximum
    ) {
      throw new Error(
        `"${field.label}" cannot exceed ${field.maximum}.`
      );
    }

    if (
      field.type ===
        "select" &&
      field.options &&
      typeof value ===
        "string" &&
      !field.options.some(
        (option) =>
          option.value ===
          value
      )
    ) {
      throw new Error(
        `"${field.label}" contains an unsupported selection.`
      );
    }

    if (
      field.type ===
        "multiselect" &&
      field.options &&
      Array.isArray(value)
    ) {
      const allowedValues =
        new Set(
          field.options.map(
            (option) =>
              option.value
          )
        );

      const invalidValue =
        value.find(
          (item) =>
            typeof item !==
              "string" ||
            !allowedValues.has(
              item
            )
        );

      if (
        invalidValue !==
        undefined
      ) {
        throw new Error(
          `"${field.label}" contains an unsupported selection.`
        );
      }
    }
  }
}

/*
 * ============================================================
 * APPROVAL CHECK
 * ============================================================
 */

export function isRoyalOSToolExecutionApproved(
  request:
    RoyalOSToolExecutionRequest
): boolean {
  const approvedBy =
    cleanOptionalText(
      request.context
        .approvedBy
    );

  const approvedAt =
    cleanOptionalText(
      request.context
        .approvedAt
    );

  if (
    !approvedBy ||
    !approvedAt
  ) {
    return false;
  }

  const approvalTime =
    new Date(
      approvedAt
    ).getTime();

  return !Number.isNaN(
    approvalTime
  );
}

/*
 * ============================================================
 * MAIN EXECUTOR
 * ============================================================
 */

export async function executeRoyalOSTool<
  TInput extends
    RoyalOSJsonObject =
      RoyalOSJsonObject,

  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
>(
  originalRequest:
    RoyalOSToolExecutionRequest<TInput>,

  options:
    ExecuteRoyalOSToolOptions = {}
): Promise<
  RoyalOSToolExecutionResult<TOutput>
> {
  const executionReceivedAt =
    new Date()
      .toISOString();

  if (
    !originalRequest.context
  ) {
    throw new Error(
      "RoyalOS tool execution context is required."
    );
  }

  const context =
    originalRequest.context;

  const actionId =
    cleanOptionalText(
      context.actionId
    ) ||
    createRoyalOSToolActionId();

  const toolId =
    cleanRequiredText(
      originalRequest.toolId,
      "Tool ID"
    );

  const action =
    cleanRequiredText(
      originalRequest.action,
      "Tool action"
    );

  if (
    !isRoyalOSEmployeeName(
      context.employee
    )
  ) {
    throw new Error(
      "RoyalOS received an invalid employee for tool execution."
    );
  }

  if (
    !isRoyalOSWorkspace(
      context.workspace
    )
  ) {
    throw new Error(
      "RoyalOS received an invalid workspace for tool execution."
    );
  }

  if (
    !isRoyalOSMissionMode(
      context.mode
    )
  ) {
    throw new Error(
      "RoyalOS received an invalid work mode for tool execution."
    );
  }

  if (
    !isValidRequester(
      context.requestedBy
    )
  ) {
    throw new Error(
      "RoyalOS received an invalid tool requester."
    );
  }

  if (
    !isJsonObject(
      originalRequest.input
    )
  ) {
    throw new Error(
      "RoyalOS tool input must be a JSON object."
    );
  }

  const registration =
    requireRoyalOSToolRegistration(
      toolId
    );

  const definition =
    registration.definition;

  const requestedEvent =
    auditRoyalOSToolRequested({
      actionId,

      missionId:
        context.missionId,

      toolId:
        definition.id,

      employee:
        context.employee,

      workspace:
        context.workspace,

      message:
        `${context.employee} requested "${definition.name}" action "${action}".`,

      details: {
        action,

        requestedBy:
          context.requestedBy,

        mode:
          context.mode,

        ...createInputSummary(
          originalRequest.input
        ),
      },
    });

  await saveAuditEvent(
    requestedEvent
  );

  const capability =
    options.capability ??
    (
      isRoyalOSToolCapability(
        action
      )
        ? action
        : undefined
    );

  const baseRequest:
    RoyalOSToolExecutionRequest<TInput> = {
      ...originalRequest,

      toolId:
        definition.id,

      action,

      context: {
        ...context,

        actionId,

        requestTimestamp:
          cleanOptionalText(
            context.requestTimestamp
          ) ||
          executionReceivedAt,
      },
    };

  if (!capability) {
    const reason =
      `RoyalOS action "${action}" is not a recognized tool capability.`;

    const permission =
      createRejectedPermission(
        definition.riskLevel,
        reason
      );

    await persistRoyalOSToolActionRequestSafely({
      definition,

      request:
        baseRequest,

      permission,
    });

    const completedAt =
      new Date()
        .toISOString();

    const failedEvent =
      auditRoyalOSToolFailed({
        actionId,

        missionId:
          context.missionId,

        toolId:
          definition.id,

        employee:
          context.employee,

        workspace:
          context.workspace,

        message:
          reason,

        details: {
          action,

          errorCode:
            "UNRECOGNIZED_TOOL_CAPABILITY",
        },
      });

    await saveAuditEvent(
      failedEvent
    );

    return saveExecutionResult(
      createResult<TOutput>({
        actionId,

        toolId:
          definition.id,

        status:
          "rejected",

        success:
          false,

        error:
          reason,

        errorCode:
          "UNRECOGNIZED_TOOL_CAPABILITY",

        retryable:
          false,

        startedAt:
          executionReceivedAt,

        completedAt,

        durationMs:
          new Date(
            completedAt
          ).getTime() -
          new Date(
            executionReceivedAt
          ).getTime(),
      })
    );
  }

  if (
    !definition
      .capabilities
      .includes(
        capability
      )
  ) {
    const reason =
      `"${definition.name}" does not provide the "${capability}" capability.`;

    const permission =
      createRejectedPermission(
        definition.riskLevel,
        reason
      );

    await persistRoyalOSToolActionRequestSafely({
      definition,

      request:
        baseRequest,

      permission,
    });

    const completedAt =
      new Date()
        .toISOString();

    const failedEvent =
      auditRoyalOSToolFailed({
        actionId,

        missionId:
          context.missionId,

        toolId:
          definition.id,

        employee:
          context.employee,

        workspace:
          context.workspace,

        message:
          reason,

        details: {
          action,

          capability,

          errorCode:
            "TOOL_CAPABILITY_NOT_SUPPORTED",
        },
      });

    await saveAuditEvent(
      failedEvent
    );

    return saveExecutionResult(
      createResult<TOutput>({
        actionId,

        toolId:
          definition.id,

        status:
          "rejected",

        success:
          false,

        error:
          reason,

        errorCode:
          "TOOL_CAPABILITY_NOT_SUPPORTED",

        retryable:
          false,

        startedAt:
          executionReceivedAt,

        completedAt,

        durationMs:
          new Date(
            completedAt
          ).getTime() -
          new Date(
            executionReceivedAt
          ).getTime(),
      })
    );
  }

  const normalizedRequest:
    RoyalOSToolExecutionRequest<TInput> = {
      ...baseRequest,

      action:
        capability,
  };

  const permissionDecision =
    evaluateRoyalOSToolPermission({
      toolId:
        definition.id,

      employee:
        context.employee,

      workspace:
        context.workspace,

      capability,
    });

  const permissionEvent =
    recordRoyalOSToolAuditEvent({
      eventType:
        "permission_checked",

      actionId,

      missionId:
        context.missionId,

      toolId:
        definition.id,

      employee:
        context.employee,

      workspace:
        context.workspace,

      message:
        permissionDecision.reason,

      details: {
        allowed:
          permissionDecision
            .allowed,

        requiresApproval:
          permissionDecision
            .requiresApproval,

        riskLevel:
          permissionDecision
            .riskLevel,

        capability,
      },
    });

  await saveAuditEvent(
    permissionEvent
  );

  await persistRoyalOSToolActionRequestSafely({
    definition,

    request:
      normalizedRequest,

    permission:
      permissionDecision,
  });

  if (
    !permissionDecision.allowed
  ) {
    const completedAt =
      new Date()
        .toISOString();

    const failedEvent =
      auditRoyalOSToolFailed({
        actionId,

        missionId:
          context.missionId,

        toolId:
          definition.id,

        employee:
          context.employee,

        workspace:
          context.workspace,

        message:
          permissionDecision
            .reason,

        details: {
          capability,

          errorCode:
            "TOOL_PERMISSION_DENIED",
        },
      });

    await saveAuditEvent(
      failedEvent
    );

    return saveExecutionResult(
      createResult<TOutput>({
        actionId,

        toolId:
          definition.id,

        status:
          "rejected",

        success:
          false,

        error:
          permissionDecision
            .reason,

        errorCode:
          "TOOL_PERMISSION_DENIED",

        retryable:
          false,

        startedAt:
          executionReceivedAt,

        completedAt,

        durationMs:
          new Date(
            completedAt
          ).getTime() -
          new Date(
            executionReceivedAt
          ).getTime(),

        metadata: {
          riskLevel:
            permissionDecision
              .riskLevel,

          capability,
        },
      })
    );
  }

  const approvalRequired =
    permissionDecision
      .requiresApproval ||
    context
      .requiresCEOApproval;

  const approved =
    isRoyalOSToolExecutionApproved(
      normalizedRequest
    );

  if (
    approvalRequired &&
    !approved
  ) {
    const approvalPersistence =
      await persistRoyalOSToolApprovalRequestSafely({
        definition,

        request:
          normalizedRequest,

        permission:
          permissionDecision,

        summary:
          `${context.employee} requests CEO approval to execute "${definition.name}" for ${capability}.`,
      });

    const approvalEvent =
      auditRoyalOSToolApprovalRequested({
        actionId,

        missionId:
          context.missionId,

        toolId:
          definition.id,

        employee:
          context.employee,

        workspace:
          context.workspace,

        message:
          `CEO approval is required before ${context.employee} can execute "${definition.name}".`,

        details: {
          capability,

          riskLevel:
            definition.riskLevel,

          requestedBy:
            context.requestedBy,

          approvalId:
            approvalPersistence
              .value
              ?.approval_id ??
            null,

          approvalSaved:
            approvalPersistence
              .saved,

          ...createInputSummary(
            originalRequest.input
          ),
        },
      });

    await saveAuditEvent(
      approvalEvent
    );

    const completedAt =
      new Date()
        .toISOString();

    return saveExecutionResult(
      createResult<TOutput>({
        actionId,

        toolId:
          definition.id,

        status:
          "awaiting_approval",

        success:
          false,

        retryable:
          false,

        startedAt:
          executionReceivedAt,

        completedAt,

        durationMs:
          new Date(
            completedAt
          ).getTime() -
          new Date(
            executionReceivedAt
          ).getTime(),

        metadata: {
          approvalRequired:
            true,

          approvalId:
            approvalPersistence
              .value
              ?.approval_id ??
            null,

          approvalSaved:
            approvalPersistence
              .saved,

          approvalPersistenceError:
            approvalPersistence
              .error,

          riskLevel:
            definition.riskLevel,

          capability,
        },
      })
    );
  }

  try {
    validateToolInput(
      originalRequest.input,
      definition.inputFields
    );
  } catch (validationError) {
    const completedAt =
      new Date()
        .toISOString();

    const errorInformation =
      getErrorInformation(
        validationError
      );

    const failedEvent =
      auditRoyalOSToolFailed({
        actionId,

        missionId:
          context.missionId,

        toolId:
          definition.id,

        employee:
          context.employee,

        workspace:
          context.workspace,

        message:
          errorInformation
            .message,

        details: {
          capability,

          errorCode:
            "TOOL_INPUT_VALIDATION_FAILED",
        },
      });

    await saveAuditEvent(
      failedEvent
    );

    return saveExecutionResult(
      createResult<TOutput>({
        actionId,

        toolId:
          definition.id,

        status:
          "failed",

        success:
          false,

        error:
          errorInformation
            .message,

        errorCode:
          "TOOL_INPUT_VALIDATION_FAILED",

        retryable:
          false,

        startedAt:
          executionReceivedAt,

        completedAt,

        durationMs:
          new Date(
            completedAt
          ).getTime() -
          new Date(
            executionReceivedAt
          ).getTime(),
      })
    );
  }

  const maximumAttempts =
    normalizeAttempts(
      options.maximumAttempts,
      definition.maximumAttempts
    );

  const retryDelayMs =
    normalizeRetryDelay(
      options.retryDelayMs
    );

  let finalError:
    ReturnType<
      typeof getErrorInformation
    > | null =
      null;

  for (
    let attempt = 1;
    attempt <=
      maximumAttempts;
    attempt += 1
  ) {
    const attemptStartedAt =
      new Date()
        .toISOString();

    const startedEvent =
      auditRoyalOSToolStarted({
        actionId,

        missionId:
          context.missionId,

        toolId:
          definition.id,

        employee:
          context.employee,

        workspace:
          context.workspace,

        message:
          `${context.employee} started "${definition.name}" attempt ${attempt} of ${maximumAttempts}.`,

        details: {
          capability,

          attempt,

          maximumAttempts,
        },
      });

    await saveAuditEvent(
      startedEvent
    );

    try {
      const handlerResult =
        await executeWithTimeout(
          registration.handler(
            normalizedRequest
          ),
          definition.id,
          definition.timeoutMs
        );

      const completedAt =
        new Date()
          .toISOString();

      const durationMs =
        new Date(
          completedAt
        ).getTime() -
        new Date(
          attemptStartedAt
        ).getTime();

      if (
        handlerResult.success
      ) {
        const result =
          createResult<TOutput>({
            actionId,

            toolId:
              definition.id,

            status:
              "succeeded",

            success:
              true,

            output:
              handlerResult
                .output as
                TOutput,

            externalId:
              handlerResult
                .externalId,

            externalUrl:
              handlerResult
                .externalUrl,

            startedAt:
              attemptStartedAt,

            completedAt,

            durationMs,

            metadata: {
              ...(
                handlerResult
                  .metadata ??
                {}
              ),

              attempt,

              maximumAttempts,

              capability,
            },
          });

        const successEvent =
          auditRoyalOSToolSucceeded({
            actionId,

            missionId:
              context.missionId,

            toolId:
              definition.id,

            employee:
              context.employee,

            workspace:
              context.workspace,

            message:
              `${context.employee} successfully completed "${definition.name}".`,

            details: {
              capability,

              attempt,

              durationMs,

              externalId:
                result.externalId,

              externalUrl:
                result.externalUrl,
            },
          });

        await saveAuditEvent(
          successEvent
        );

        return saveExecutionResult(
          result
        );
      }

      const handlerError = {
        message:
          handlerResult.error ||
          `"${definition.name}" did not complete successfully.`,

        code:
          handlerResult
            .errorCode ||
          "TOOL_HANDLER_FAILED",

        retryable:
          handlerResult
            .retryable ??
          false,
      };

      finalError =
        handlerError;

      const canRetry =
        handlerError
          .retryable &&
        attempt <
          maximumAttempts;

      if (!canRetry) {
        const failedEvent =
          auditRoyalOSToolFailed({
            actionId,

            missionId:
              context.missionId,

            toolId:
              definition.id,

            employee:
              context.employee,

            workspace:
              context.workspace,

            message:
              handlerError
                .message,

            details: {
              capability,

              attempt,

              maximumAttempts,

              errorCode:
                handlerError
                  .code,
            },
          });

        await saveAuditEvent(
          failedEvent
        );

        return saveExecutionResult(
          createResult<TOutput>({
            actionId,

            toolId:
              definition.id,

            status:
              handlerResult
                .status ===
                "cancelled"
                  ? "cancelled"
                  : "failed",

            success:
              false,

            output:
              handlerResult
                .output as
                TOutput,

            error:
              handlerError
                .message,

            errorCode:
              handlerError
                .code,

            retryable:
              handlerError
                .retryable,

            externalId:
              handlerResult
                .externalId,

            externalUrl:
              handlerResult
                .externalUrl,

            startedAt:
              attemptStartedAt,

            completedAt,

            durationMs,

            metadata: {
              ...(
                handlerResult
                  .metadata ??
                {}
              ),

              attempt,

              maximumAttempts,

              capability,
            },
          })
        );
      }
    } catch (executionError) {
      finalError =
        getErrorInformation(
          executionError
        );

      const canRetry =
        finalError.retryable &&
        attempt <
          maximumAttempts;

      if (!canRetry) {
        const completedAt =
          new Date()
            .toISOString();

        const durationMs =
          new Date(
            completedAt
          ).getTime() -
          new Date(
            attemptStartedAt
          ).getTime();

        const failedEvent =
          auditRoyalOSToolFailed({
            actionId,

            missionId:
              context.missionId,

            toolId:
              definition.id,

            employee:
              context.employee,

            workspace:
              context.workspace,

            message:
              finalError
                .message,

            details: {
              capability,

              attempt,

              maximumAttempts,

              errorCode:
                finalError.code,

              retryable:
                finalError
                  .retryable,
            },
          });

        await saveAuditEvent(
          failedEvent
        );

        return saveExecutionResult(
          createResult<TOutput>({
            actionId,

            toolId:
              definition.id,

            status:
              "failed",

            success:
              false,

            error:
              finalError
                .message,

            errorCode:
              finalError
                .code,

            retryable:
              finalError
                .retryable,

            startedAt:
              attemptStartedAt,

            completedAt,

            durationMs,

            metadata: {
              attempt,

              maximumAttempts,

              capability,
            },
          })
        );
      }
    }

    await delay(
      retryDelayMs *
        attempt
    );
  }

  const completedAt =
    new Date()
      .toISOString();

  const fallbackError =
    finalError ?? {
      message:
        `"${definition.name}" could not complete the requested action.`,

      code:
        "TOOL_EXECUTION_FAILED",

      retryable:
        false,
    };

  const failedEvent =
    auditRoyalOSToolFailed({
      actionId,

      missionId:
        context.missionId,

      toolId:
        definition.id,

      employee:
        context.employee,

      workspace:
        context.workspace,

      message:
        fallbackError
          .message,

      details: {
        capability,

        maximumAttempts,

        errorCode:
          fallbackError.code,
      },
    });

  await saveAuditEvent(
    failedEvent
  );

  return saveExecutionResult(
    createResult<TOutput>({
      actionId,

      toolId:
        definition.id,

      status:
        "failed",

      success:
        false,

      error:
        fallbackError
          .message,

      errorCode:
        fallbackError
          .code,

      retryable:
        fallbackError
          .retryable,

      startedAt:
        executionReceivedAt,

      completedAt,

      durationMs:
        new Date(
          completedAt
        ).getTime() -
        new Date(
          executionReceivedAt
        ).getTime(),
    })
  );
}

/*
 * ============================================================
 * STRICT EXECUTION
 * ============================================================
 */

export async function executeRoyalOSToolOrThrow<
  TInput extends
    RoyalOSJsonObject =
      RoyalOSJsonObject,

  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
>(
  request:
    RoyalOSToolExecutionRequest<TInput>,

  options:
    ExecuteRoyalOSToolOptions = {}
): Promise<
  RoyalOSToolExecutionResult<TOutput>
> {
  const result =
    await executeRoyalOSTool<
      TInput,
      TOutput
    >(
      request,
      options
    );

  if (
    !result.success
  ) {
    if (
      result.status ===
      "awaiting_approval"
    ) {
      throw new Error(
        `RoyalOS tool action "${result.actionId}" is waiting for CEO approval.`
      );
    }

    throw new Error(
      result.error ||
      `RoyalOS tool "${result.toolId}" failed.`
    );
  }

  return result;
}