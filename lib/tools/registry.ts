import "server-only";

import {
  isRoyalOSToolApprovalPolicy,
  isRoyalOSToolCapability,
  isRoyalOSToolCategory,
  isRoyalOSToolProvider,
  isRoyalOSToolRiskLevel,
  type RoyalOSToolCapability,
  type RoyalOSToolCategory,
  type RoyalOSToolDefinition,
  type RoyalOSToolProvider,
  type RoyalOSToolRegistration,
  type RoyalOSToolRiskLevel,
} from "@/lib/tools/types";

import {
  isRoyalOSEmployeeName,
  isRoyalOSWorkspace,
  type RoyalOSEmployeeName,
  type RoyalOSJsonObject,
  type RoyalOSJsonValue,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * REGISTRY TYPES
 * ============================================================
 */

type StoredRoyalOSToolRegistration =
  RoyalOSToolRegistration<
    RoyalOSJsonObject,
    RoyalOSJsonValue
  >;

export type RegisterRoyalOSToolOptions = {
  replace?: boolean;
};

export type RoyalOSToolRegistryFilters = {
  search?: string;

  category?:
    RoyalOSToolCategory;

  provider?:
    RoyalOSToolProvider;

  capability?:
    RoyalOSToolCapability;

  riskLevel?:
    RoyalOSToolRiskLevel;

  employee?:
    RoyalOSEmployeeName;

  workspace?:
    RoyalOSWorkspace;

  enabled?:
    boolean;

  requiresConnection?:
    boolean;
};

export type RoyalOSToolRegistrySummary = {
  totalTools: number;

  enabledTools: number;

  disabledTools: number;

  connectedToolsRequired: number;

  toolsByCategory:
    Partial<
      Record<
        RoyalOSToolCategory,
        number
      >
    >;

  toolsByProvider:
    Partial<
      Record<
        RoyalOSToolProvider,
        number
      >
    >;

  toolsByRiskLevel:
    Partial<
      Record<
        RoyalOSToolRiskLevel,
        number
      >
    >;
};

/*
 * ============================================================
 * GLOBAL REGISTRY
 * ============================================================
 *
 * The development registry is stored on globalThis so that
 * Next.js hot reloads do not continuously erase the tools.
 */

declare global {
  var __royalOSToolRegistry:
    | Map<
        string,
        StoredRoyalOSToolRegistration
      >
    | undefined;
}

const toolRegistry =
  globalThis
    .__royalOSToolRegistry ??
  new Map<
    string,
    StoredRoyalOSToolRegistration
  >();

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalThis
    .__royalOSToolRegistry =
    toolRegistry;
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
      `${fieldName} is required for a RoyalOS tool.`
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
      `RoyalOS tool ID "${toolId}" is invalid. Use 3-80 lowercase letters, numbers, periods, underscores, or hyphens.`
    );
  }

  return toolId;
}

function uniqueStrings<
  T extends string,
>(
  values: T[]
): T[] {
  return Array.from(
    new Set(values)
  );
}

function validateToolDefinition(
  definition:
    RoyalOSToolDefinition
): RoyalOSToolDefinition {
  const id =
    normalizeToolId(
      definition.id
    );

  const name =
    cleanRequiredText(
      definition.name,
      "Tool name"
    );

  const description =
    cleanRequiredText(
      definition.description,
      "Tool description"
    );

  const version =
    cleanRequiredText(
      definition.version,
      "Tool version"
    );

  if (
    !isRoyalOSToolCategory(
      definition.category
    )
  ) {
    throw new Error(
      `RoyalOS tool "${id}" has an invalid category.`
    );
  }

  if (
    !isRoyalOSToolProvider(
      definition.provider
    )
  ) {
    throw new Error(
      `RoyalOS tool "${id}" has an invalid provider.`
    );
  }

  if (
    !isRoyalOSToolRiskLevel(
      definition.riskLevel
    )
  ) {
    throw new Error(
      `RoyalOS tool "${id}" has an invalid risk level.`
    );
  }

  if (
    !isRoyalOSToolApprovalPolicy(
      definition.approvalPolicy
    )
  ) {
    throw new Error(
      `RoyalOS tool "${id}" has an invalid approval policy.`
    );
  }

  const capabilities =
    uniqueStrings(
      definition.capabilities
    );

  if (
    capabilities.length === 0
  ) {
    throw new Error(
      `RoyalOS tool "${id}" must have at least one capability.`
    );
  }

  const invalidCapability =
    capabilities.find(
      (capability) =>
        !isRoyalOSToolCapability(
          capability
        )
    );

  if (
    invalidCapability
  ) {
    throw new Error(
      `RoyalOS tool "${id}" contains invalid capability "${invalidCapability}".`
    );
  }

  const allowedEmployees =
    uniqueStrings(
      definition.allowedEmployees
    );

  if (
    allowedEmployees.length ===
    0
  ) {
    throw new Error(
      `RoyalOS tool "${id}" must have at least one allowed employee.`
    );
  }

  const invalidEmployee =
    allowedEmployees.find(
      (employee) =>
        !isRoyalOSEmployeeName(
          employee
        )
    );

  if (
    invalidEmployee
  ) {
    throw new Error(
      `RoyalOS tool "${id}" contains invalid employee "${invalidEmployee}".`
    );
  }

  const allowedWorkspaces =
    definition
      .allowedWorkspaces
      ? uniqueStrings(
          definition
            .allowedWorkspaces
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
      `RoyalOS tool "${id}" contains invalid workspace "${invalidWorkspace}".`
    );
  }

  if (
    !Number.isFinite(
      definition.timeoutMs
    ) ||
    definition.timeoutMs <
      1_000 ||
    definition.timeoutMs >
      300_000
  ) {
    throw new Error(
      `RoyalOS tool "${id}" timeout must be between 1,000 and 300,000 milliseconds.`
    );
  }

  if (
    !Number.isInteger(
      definition.maximumAttempts
    ) ||
    definition
      .maximumAttempts <
      1 ||
    definition
      .maximumAttempts >
      5
  ) {
    throw new Error(
      `RoyalOS tool "${id}" maximum attempts must be between 1 and 5.`
    );
  }

  const connectionKey =
    definition
      .connectionKey
      ?.trim();

  if (
    definition
      .requiresConnection &&
    !connectionKey
  ) {
    throw new Error(
      `RoyalOS tool "${id}" requires a connectionKey because requiresConnection is enabled.`
    );
  }

  const inputFieldKeys =
    definition
      .inputFields
      ?.map(
        (field) =>
          field.key.trim()
      ) ??
    [];

  if (
    new Set(
      inputFieldKeys
    ).size !==
    inputFieldKeys.length
  ) {
    throw new Error(
      `RoyalOS tool "${id}" contains duplicate input field keys.`
    );
  }

  return {
    ...definition,

    id,

    name,

    description,

    version,

    capabilities,

    allowedEmployees,

    allowedWorkspaces,

    connectionKey:
      connectionKey ||
      undefined,

    timeoutMs:
      Math.floor(
        definition.timeoutMs
      ),

    maximumAttempts:
      Math.floor(
        definition
          .maximumAttempts
      ),

    inputFields:
      definition
        .inputFields
        ?.map(
          (field) => ({
            ...field,

            key:
              cleanRequiredText(
                field.key,
                "Tool input field key"
              ),

            label:
              cleanRequiredText(
                field.label,
                "Tool input field label"
              ),

            options:
              field.options
                ?.map(
                  (option) => ({
                    label:
                      cleanRequiredText(
                        option.label,
                        "Tool option label"
                      ),

                    value:
                      cleanRequiredText(
                        option.value,
                        "Tool option value"
                      ),
                  })
                ),

            acceptedFileTypes:
              field
                .acceptedFileTypes
                ? uniqueStrings(
                    field
                      .acceptedFileTypes
                      .map(
                        (fileType) =>
                          fileType
                            .trim()
                      )
                      .filter(
                        Boolean
                      )
                  )
                : undefined,
          })
        ),

    metadata: {
      ...(
        definition
          .metadata ??
        {}
      ),
    },
  };
}

function cloneToolDefinition(
  definition:
    RoyalOSToolDefinition
): RoyalOSToolDefinition {
  return {
    ...definition,

    capabilities: [
      ...definition
        .capabilities,
    ],

    allowedEmployees: [
      ...definition
        .allowedEmployees,
    ],

    allowedWorkspaces:
      definition
        .allowedWorkspaces
        ? [
            ...definition
              .allowedWorkspaces,
          ]
        : undefined,

    inputFields:
      definition
        .inputFields
        ?.map(
          (field) => ({
            ...field,

            options:
              field.options
                ?.map(
                  (option) => ({
                    ...option,
                  })
                ),

            acceptedFileTypes:
              field
                .acceptedFileTypes
                ? [
                    ...field
                      .acceptedFileTypes,
                  ]
                : undefined,
          })
        ),

    metadata: {
      ...(
        definition
          .metadata ??
        {}
      ),
    },
  };
}

function matchesSearch(
  definition:
    RoyalOSToolDefinition,
  search: string
): boolean {
  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  if (
    !normalizedSearch
  ) {
    return true;
  }

  const searchableText = [
    definition.id,
    definition.name,
    definition.description,
    definition.category,
    definition.provider,
    ...definition
      .capabilities,
    ...definition
      .allowedEmployees,
    ...(
      definition
        .allowedWorkspaces ??
      []
    ),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(
    normalizedSearch
  );
}

/*
 * ============================================================
 * REGISTRATION
 * ============================================================
 */

export function registerRoyalOSTool<
  TInput extends
    RoyalOSJsonObject =
      RoyalOSJsonObject,

  TOutput extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
>(
  registration:
    RoyalOSToolRegistration<
      TInput,
      TOutput
    >,

  options:
    RegisterRoyalOSToolOptions = {}
): RoyalOSToolDefinition {
  if (
    typeof registration
      .handler !==
    "function"
  ) {
    throw new Error(
      "A RoyalOS tool registration must include a handler function."
    );
  }

  const definition =
    validateToolDefinition(
      registration
        .definition
    );

  const existing =
    toolRegistry.get(
      definition.id
    );

  const replace =
    options.replace ??
    process.env.NODE_ENV !==
      "production";

  if (
    existing &&
    !replace
  ) {
    throw new Error(
      `RoyalOS tool "${definition.id}" is already registered.`
    );
  }

  toolRegistry.set(
    definition.id,
    registration as unknown as
      StoredRoyalOSToolRegistration
  );

  const stored =
    toolRegistry.get(
      definition.id
    );

  if (!stored) {
    throw new Error(
      `RoyalOS could not register tool "${definition.id}".`
    );
  }

  stored.definition =
    definition;

  console.log(
    "RoyalOS tool registered:",
    {
      toolId:
        definition.id,

      name:
        definition.name,

      provider:
        definition.provider,

      enabled:
        definition.enabled,
    }
  );

  return cloneToolDefinition(
    definition
  );
}

export function registerRoyalOSTools(
  registrations:
    RoyalOSToolRegistration<
      RoyalOSJsonObject,
      RoyalOSJsonValue
    >[],

  options:
    RegisterRoyalOSToolOptions = {}
): RoyalOSToolDefinition[] {
  return registrations.map(
    (registration) =>
      registerRoyalOSTool(
        registration,
        options
      )
  );
}

/*
 * ============================================================
 * LOOKUP
 * ============================================================
 */

export function isRoyalOSToolRegistered(
  toolId: string
): boolean {
  const normalizedId =
    normalizeToolId(
      toolId
    );

  return toolRegistry.has(
    normalizedId
  );
}

export function getRoyalOSToolRegistration(
  toolId: string
):
  | StoredRoyalOSToolRegistration
  | null {
  const normalizedId =
    normalizeToolId(
      toolId
    );

  return (
    toolRegistry.get(
      normalizedId
    ) ??
    null
  );
}

export function requireRoyalOSToolRegistration(
  toolId: string
): StoredRoyalOSToolRegistration {
  const registration =
    getRoyalOSToolRegistration(
      toolId
    );

  if (!registration) {
    throw new Error(
      `RoyalOS tool "${toolId}" is not registered.`
    );
  }

  return registration;
}

export function getRoyalOSToolDefinition(
  toolId: string
):
  | RoyalOSToolDefinition
  | null {
  const registration =
    getRoyalOSToolRegistration(
      toolId
    );

  if (!registration) {
    return null;
  }

  return cloneToolDefinition(
    registration.definition
  );
}

export function requireRoyalOSToolDefinition(
  toolId: string
): RoyalOSToolDefinition {
  const definition =
    getRoyalOSToolDefinition(
      toolId
    );

  if (!definition) {
    throw new Error(
      `RoyalOS tool "${toolId}" is not registered.`
    );
  }

  return definition;
}

/*
 * ============================================================
 * LIST AND FILTER
 * ============================================================
 */

export function listRoyalOSToolDefinitions(
  filters:
    RoyalOSToolRegistryFilters = {}
): RoyalOSToolDefinition[] {
  const definitions =
    Array.from(
      toolRegistry.values()
    )
      .map(
        (registration) =>
          registration
            .definition
      )
      .filter(
        (definition) => {
          if (
            filters.search &&
            !matchesSearch(
              definition,
              filters.search
            )
          ) {
            return false;
          }

          if (
            filters.category &&
            definition.category !==
              filters.category
          ) {
            return false;
          }

          if (
            filters.provider &&
            definition.provider !==
              filters.provider
          ) {
            return false;
          }

          if (
            filters.riskLevel &&
            definition.riskLevel !==
              filters.riskLevel
          ) {
            return false;
          }

          if (
            filters.capability &&
            !definition
              .capabilities
              .includes(
                filters
                  .capability
              )
          ) {
            return false;
          }

          if (
            typeof filters
              .enabled ===
              "boolean" &&
            definition.enabled !==
              filters.enabled
          ) {
            return false;
          }

          if (
            typeof filters
              .requiresConnection ===
              "boolean" &&
            definition
              .requiresConnection !==
              filters
                .requiresConnection
          ) {
            return false;
          }

          if (
            filters.employee &&
            !definition
              .allowedEmployees
              .includes(
                filters
                  .employee
              )
          ) {
            return false;
          }

          if (
            filters.workspace &&
            definition
              .allowedWorkspaces &&
            !definition
              .allowedWorkspaces
              .includes(
                filters
                  .workspace
              )
          ) {
            return false;
          }

          return true;
        }
      )
      .sort(
        (first, second) =>
          first.category.localeCompare(
            second.category
          ) ||
          first.name.localeCompare(
            second.name
          )
      );

  return definitions.map(
    cloneToolDefinition
  );
}

/*
 * ============================================================
 * ENABLE, DISABLE, AND REMOVE
 * ============================================================
 */

export function setRoyalOSToolEnabled(
  toolId: string,
  enabled: boolean
): RoyalOSToolDefinition {
  const registration =
    requireRoyalOSToolRegistration(
      toolId
    );

  registration.definition = {
    ...registration
      .definition,

    enabled,
  };

  return cloneToolDefinition(
    registration.definition
  );
}

export function removeRoyalOSTool(
  toolId: string
): boolean {
  const normalizedId =
    normalizeToolId(
      toolId
    );

  return toolRegistry.delete(
    normalizedId
  );
}

export function clearRoyalOSToolRegistry(): void {
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "RoyalOS cannot clear the complete tool registry in production."
    );
  }

  toolRegistry.clear();
}

/*
 * ============================================================
 * REGISTRY SUMMARY
 * ============================================================
 */

export function getRoyalOSToolRegistrySummary():
  RoyalOSToolRegistrySummary {
  const definitions =
    listRoyalOSToolDefinitions();

  const summary:
    RoyalOSToolRegistrySummary = {
      totalTools:
        definitions.length,

      enabledTools:
        0,

      disabledTools:
        0,

      connectedToolsRequired:
        0,

      toolsByCategory:
        {},

      toolsByProvider:
        {},

      toolsByRiskLevel:
        {},
    };

  for (
    const definition of
    definitions
  ) {
    if (
      definition.enabled
    ) {
      summary.enabledTools +=
        1;
    } else {
      summary.disabledTools +=
        1;
    }

    if (
      definition
        .requiresConnection
    ) {
      summary
        .connectedToolsRequired +=
        1;
    }

    summary.toolsByCategory[
      definition.category
    ] =
      (
        summary
          .toolsByCategory[
          definition.category
        ] ??
        0
      ) + 1;

    summary.toolsByProvider[
      definition.provider
    ] =
      (
        summary
          .toolsByProvider[
          definition.provider
        ] ??
        0
      ) + 1;

    summary.toolsByRiskLevel[
      definition.riskLevel
    ] =
      (
        summary
          .toolsByRiskLevel[
          definition.riskLevel
        ] ??
        0
      ) + 1;
  }

  return summary;
}