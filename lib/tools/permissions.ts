import "server-only";

import {
  getRoyalOSToolDefinition,
  listRoyalOSToolDefinitions,
} from "@/lib/tools/registry";

import {
  isRoyalOSToolApprovalPolicy,
  isRoyalOSToolCapability,
  type RoyalOSToolApprovalPolicy,
  type RoyalOSToolCapability,
  type RoyalOSToolDefinition,
  type RoyalOSToolPermissionDecision,
  type RoyalOSToolPermissionRule,
  type RoyalOSToolRiskLevel,
} from "@/lib/tools/types";

import {
  isRoyalOSEmployeeName,
  isRoyalOSWorkspace,
  type RoyalOSEmployeeName,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * PERMISSION CHECK TYPES
 * ============================================================
 */

export type RoyalOSToolPermissionCheck = {
  toolId: string;

  employee:
    RoyalOSEmployeeName;

  workspace:
    RoyalOSWorkspace;

  capability?:
    RoyalOSToolCapability;
};

export type RoyalOSToolPermissionSummary = {
  employee:
    RoyalOSEmployeeName;

  workspace:
    RoyalOSWorkspace;

  totalRegisteredTools:
    number;

  availableTools:
    number;

  restrictedTools:
    number;

  toolsRequiringApproval:
    number;

  toolsWithoutApproval:
    number;

  toolIds:
    string[];
};

/*
 * ============================================================
 * GLOBAL PERMISSION RULE STORAGE
 * ============================================================
 *
 * Rules remain available during Next.js development hot reloads.
 * Permanent database storage will be added later.
 */

declare global {
  var __royalOSToolPermissionRules:
    | Map<
        string,
        RoyalOSToolPermissionRule
      >
    | undefined;
}

const permissionRules =
  globalThis
    .__royalOSToolPermissionRules ??
  new Map<
    string,
    RoyalOSToolPermissionRule
  >();

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalThis
    .__royalOSToolPermissionRules =
    permissionRules;
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
      `${fieldName} is required for a RoyalOS tool permission.`
    );
  }

  return cleaned;
}

function normalizeToolId(
  value: unknown
): string {
  const toolId =
    cleanRequiredText(
      value,
      "Tool ID"
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        "_"
      );

  const validToolId =
    /^[a-z0-9][a-z0-9._-]{2,79}$/;

  if (
    !validToolId.test(
      toolId
    )
  ) {
    throw new Error(
      `RoyalOS tool ID "${toolId}" is invalid.`
    );
  }

  return toolId;
}

function createPermissionKey(
  employee:
    RoyalOSEmployeeName,
  toolId: string
): string {
  return `${employee}::${normalizeToolId(
    toolId
  )}`;
}

function uniqueValues<
  TValue extends string,
>(
  values: TValue[]
): TValue[] {
  return Array.from(
    new Set(values)
  );
}

function clonePermissionRule(
  rule:
    RoyalOSToolPermissionRule
): RoyalOSToolPermissionRule {
  return {
    ...rule,

    allowedCapabilities:
      rule.allowedCapabilities
        ? [
            ...rule
              .allowedCapabilities,
          ]
        : undefined,

    allowedWorkspaces:
      rule.allowedWorkspaces
        ? [
            ...rule
              .allowedWorkspaces,
          ]
        : undefined,
  };
}

function validatePermissionRule(
  rule:
    RoyalOSToolPermissionRule
): RoyalOSToolPermissionRule {
  if (
    !isRoyalOSEmployeeName(
      rule.employee
    )
  ) {
    throw new Error(
      `RoyalOS received an invalid employee for tool permission "${rule.toolId}".`
    );
  }

  const toolId =
    normalizeToolId(
      rule.toolId
    );

  if (
    typeof rule.allowed !==
    "boolean"
  ) {
    throw new Error(
      `RoyalOS permission for "${toolId}" must specify whether access is allowed.`
    );
  }

  const allowedCapabilities =
    rule.allowedCapabilities
      ? uniqueValues(
          rule.allowedCapabilities
        )
      : undefined;

  const invalidCapability =
    allowedCapabilities?.find(
      (capability) =>
        !isRoyalOSToolCapability(
          capability
        )
    );

  if (
    invalidCapability
  ) {
    throw new Error(
      `RoyalOS permission for "${toolId}" contains invalid capability "${invalidCapability}".`
    );
  }

  const allowedWorkspaces =
    rule.allowedWorkspaces
      ? uniqueValues(
          rule.allowedWorkspaces
        )
      : undefined;

  const invalidWorkspace =
    allowedWorkspaces?.find(
      (workspace) =>
        !isRoyalOSWorkspace(
          workspace
        )
    );

  if (
    invalidWorkspace
  ) {
    throw new Error(
      `RoyalOS permission for "${toolId}" contains invalid workspace "${invalidWorkspace}".`
    );
  }

  if (
    rule
      .approvalPolicyOverride &&
    !isRoyalOSToolApprovalPolicy(
      rule
        .approvalPolicyOverride
    )
  ) {
    throw new Error(
      `RoyalOS permission for "${toolId}" contains an invalid approval policy override.`
    );
  }

  if (
    rule.maximumActionsPerHour !==
      undefined &&
    (
      !Number.isInteger(
        rule.maximumActionsPerHour
      ) ||
      rule.maximumActionsPerHour <
        1 ||
      rule.maximumActionsPerHour >
        1_000
    )
  ) {
    throw new Error(
      `RoyalOS permission for "${toolId}" must set maximumActionsPerHour between 1 and 1,000.`
    );
  }

  return {
    ...rule,

    toolId,

    allowedCapabilities,

    allowedWorkspaces,

    notes:
      rule.notes
        ?.trim() ||
      undefined,
  };
}

function approvalRequiredByPolicy(
  policy:
    RoyalOSToolApprovalPolicy,
  riskLevel:
    RoyalOSToolRiskLevel
): boolean {
  /*
   * Critical actions always require CEO approval.
   */

  if (
    riskLevel ===
    "critical"
  ) {
    return true;
  }

  if (
    policy ===
    "always"
  ) {
    return true;
  }

  if (
    policy ===
    "never"
  ) {
    return false;
  }

  /*
   * high_risk_only:
   * Critical was already handled above.
   */

  return (
    riskLevel ===
    "high"
  );
}

function createDeniedDecision(
  definition:
    RoyalOSToolDefinition | null,
  reason: string,
  matchedRule?:
    RoyalOSToolPermissionRule
): RoyalOSToolPermissionDecision {
  const decision:
    RoyalOSToolPermissionDecision = {
      allowed:
        false,

      requiresApproval:
        false,

      riskLevel:
        definition
          ?.riskLevel ??
        "critical",

      reason,
    };

  if (matchedRule) {
    decision.matchedRule =
      clonePermissionRule(
        matchedRule
      );
  }

  return decision;
}

/*
 * ============================================================
 * CREATE OR UPDATE PERMISSION RULES
 * ============================================================
 */

export function setRoyalOSToolPermissionRule(
  rule:
    RoyalOSToolPermissionRule
): RoyalOSToolPermissionRule {
  const validatedRule =
    validatePermissionRule(
      rule
    );

  const key =
    createPermissionKey(
      validatedRule.employee,
      validatedRule.toolId
    );

  permissionRules.set(
    key,
    validatedRule
  );

  console.log(
    "RoyalOS tool permission saved:",
    {
      employee:
        validatedRule.employee,

      toolId:
        validatedRule.toolId,

      allowed:
        validatedRule.allowed,

      approvalPolicyOverride:
        validatedRule
          .approvalPolicyOverride ??
        null,
    }
  );

  return clonePermissionRule(
    validatedRule
  );
}

export function setRoyalOSToolPermissionRules(
  rules:
    RoyalOSToolPermissionRule[]
): RoyalOSToolPermissionRule[] {
  return rules.map(
    setRoyalOSToolPermissionRule
  );
}

/*
 * ============================================================
 * READ PERMISSION RULES
 * ============================================================
 */

export function getRoyalOSToolPermissionRule(
  employee:
    RoyalOSEmployeeName,
  toolId: string
):
  | RoyalOSToolPermissionRule
  | null {
  const key =
    createPermissionKey(
      employee,
      toolId
    );

  const rule =
    permissionRules.get(
      key
    );

  return rule
    ? clonePermissionRule(
        rule
      )
    : null;
}

export function listRoyalOSToolPermissionRules(
  filters: {
    employee?:
      RoyalOSEmployeeName;

    toolId?: string;

    allowed?: boolean;
  } = {}
): RoyalOSToolPermissionRule[] {
  const normalizedToolId =
    filters.toolId
      ? normalizeToolId(
          filters.toolId
        )
      : undefined;

  return Array.from(
    permissionRules.values()
  )
    .filter(
      (rule) => {
        if (
          filters.employee &&
          rule.employee !==
            filters.employee
        ) {
          return false;
        }

        if (
          normalizedToolId &&
          rule.toolId !==
            normalizedToolId
        ) {
          return false;
        }

        if (
          typeof filters.allowed ===
            "boolean" &&
          rule.allowed !==
            filters.allowed
        ) {
          return false;
        }

        return true;
      }
    )
    .sort(
      (first, second) =>
        first.employee.localeCompare(
          second.employee
        ) ||
        first.toolId.localeCompare(
          second.toolId
        )
    )
    .map(
      clonePermissionRule
    );
}

/*
 * ============================================================
 * REMOVE PERMISSION RULES
 * ============================================================
 */

export function removeRoyalOSToolPermissionRule(
  employee:
    RoyalOSEmployeeName,
  toolId: string
): boolean {
  const key =
    createPermissionKey(
      employee,
      toolId
    );

  return permissionRules.delete(
    key
  );
}

export function clearRoyalOSToolPermissionRules():
  void {
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "RoyalOS cannot clear all tool permission rules in production."
    );
  }

  permissionRules.clear();
}

/*
 * ============================================================
 * PERMISSION EVALUATION
 * ============================================================
 */

export function evaluateRoyalOSToolPermission(
  check:
    RoyalOSToolPermissionCheck
): RoyalOSToolPermissionDecision {
  let definition:
    RoyalOSToolDefinition | null;

  try {
    definition =
      getRoyalOSToolDefinition(
        check.toolId
      );
  } catch (error) {
    return createDeniedDecision(
      null,
      error instanceof Error
        ? error.message
        : "RoyalOS received an invalid tool ID."
    );
  }

  if (!definition) {
    return createDeniedDecision(
      null,
      `RoyalOS tool "${check.toolId}" is not registered.`
    );
  }

  if (
    !isRoyalOSEmployeeName(
      check.employee
    )
  ) {
    return createDeniedDecision(
      definition,
      "RoyalOS received an invalid employee for the permission check."
    );
  }

  if (
    !isRoyalOSWorkspace(
      check.workspace
    )
  ) {
    return createDeniedDecision(
      definition,
      "RoyalOS received an invalid workspace for the permission check."
    );
  }

  if (
    !definition.enabled
  ) {
    return createDeniedDecision(
      definition,
      `RoyalOS tool "${definition.name}" is currently disabled.`
    );
  }

  /*
   * The tool definition is the hard employee boundary.
   * A permission override cannot grant a tool to an employee
   * excluded from the registered tool definition.
   */

  if (
    !definition
      .allowedEmployees
      .includes(
        check.employee
      )
  ) {
    return createDeniedDecision(
      definition,
      `${check.employee} is not included in the registered employee list for "${definition.name}".`
    );
  }

  if (
    definition
      .allowedWorkspaces &&
    !definition
      .allowedWorkspaces
      .includes(
        check.workspace
      )
  ) {
    return createDeniedDecision(
      definition,
      `"${definition.name}" is not available inside the ${check.workspace} workspace.`
    );
  }

  if (
    check.capability &&
    !definition
      .capabilities
      .includes(
        check.capability
      )
  ) {
    return createDeniedDecision(
      definition,
      `"${definition.name}" does not provide the "${check.capability}" capability.`
    );
  }

  const rule =
    getRoyalOSToolPermissionRule(
      check.employee,
      definition.id
    );

  if (
    rule &&
    !rule.allowed
  ) {
    return createDeniedDecision(
      definition,
      `${check.employee} has been explicitly denied access to "${definition.name}".`,
      rule
    );
  }

  if (
    rule
      ?.allowedWorkspaces &&
    !rule
      .allowedWorkspaces
      .includes(
        check.workspace
      )
  ) {
    return createDeniedDecision(
      definition,
      `${check.employee}'s permission for "${definition.name}" does not include the ${check.workspace} workspace.`,
      rule
    );
  }

  if (
    check.capability &&
    rule
      ?.allowedCapabilities &&
    !rule
      .allowedCapabilities
      .includes(
        check.capability
      )
  ) {
    return createDeniedDecision(
      definition,
      `${check.employee}'s permission does not include the "${check.capability}" capability for "${definition.name}".`,
      rule
    );
  }

  const approvalPolicy =
    rule
      ?.approvalPolicyOverride ??
    definition
      .approvalPolicy;

  const requiresApproval =
    approvalRequiredByPolicy(
      approvalPolicy,
      definition.riskLevel
    );

  const decision:
    RoyalOSToolPermissionDecision = {
      allowed:
        true,

      requiresApproval,

      riskLevel:
        definition.riskLevel,

      reason:
        requiresApproval
          ? `${check.employee} may use "${definition.name}", but CEO approval is required before execution.`
          : `${check.employee} is authorized to use "${definition.name}" without advance CEO approval.`,
    };

  if (rule) {
    decision.matchedRule =
      clonePermissionRule(
        rule
      );
  }

  return decision;
}

/*
 * ============================================================
 * STRICT PERMISSION REQUIREMENT
 * ============================================================
 */

export function requireRoyalOSToolPermission(
  check:
    RoyalOSToolPermissionCheck
): RoyalOSToolPermissionDecision {
  const decision =
    evaluateRoyalOSToolPermission(
      check
    );

  if (
    !decision.allowed
  ) {
    throw new Error(
      decision.reason
    );
  }

  return decision;
}

/*
 * ============================================================
 * AVAILABLE TOOLS FOR AN EMPLOYEE
 * ============================================================
 */

export function listRoyalOSToolsAvailableToEmployee(
  employee:
    RoyalOSEmployeeName,
  workspace:
    RoyalOSWorkspace,
  capability?:
    RoyalOSToolCapability
): RoyalOSToolDefinition[] {
  const tools =
    listRoyalOSToolDefinitions({
      employee,
      workspace,
      enabled:
        true,
      capability,
    });

  return tools.filter(
    (tool) =>
      evaluateRoyalOSToolPermission({
        toolId:
          tool.id,

        employee,

        workspace,

        capability,
      }).allowed
  );
}

/*
 * ============================================================
 * PERMISSION SUMMARY
 * ============================================================
 */

export function getRoyalOSToolPermissionSummary(
  employee:
    RoyalOSEmployeeName,
  workspace:
    RoyalOSWorkspace
): RoyalOSToolPermissionSummary {
  const registeredTools =
    listRoyalOSToolDefinitions();

  const availableTools:
    RoyalOSToolDefinition[] = [];

  let toolsRequiringApproval =
    0;

  let toolsWithoutApproval =
    0;

  for (
    const tool of
    registeredTools
  ) {
    const decision =
      evaluateRoyalOSToolPermission({
        toolId:
          tool.id,

        employee,

        workspace,
      });

    if (
      !decision.allowed
    ) {
      continue;
    }

    availableTools.push(
      tool
    );

    if (
      decision
        .requiresApproval
    ) {
      toolsRequiringApproval +=
        1;
    } else {
      toolsWithoutApproval +=
        1;
    }
  }

  return {
    employee,

    workspace,

    totalRegisteredTools:
      registeredTools.length,

    availableTools:
      availableTools.length,

    restrictedTools:
      registeredTools.length -
      availableTools.length,

    toolsRequiringApproval,

    toolsWithoutApproval,

    toolIds:
      availableTools.map(
        (tool) =>
          tool.id
      ),
  };
}