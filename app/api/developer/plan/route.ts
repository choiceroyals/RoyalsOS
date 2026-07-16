import {
  createRoyalOSDeveloperPlan,
} from "@/lib/developer/planner";

import {
  getRoyalOSDeveloperSecurityPolicy,
  getRoyalOSDeveloperSecuritySummary,
} from "@/lib/developer/security";

import {
  isRoyalOSDeveloperEmployee,
  type RoyalOSDeveloperEmployee,
} from "@/lib/developer/types";

import {
  isRoyalOSWorkspace,
  type RoyalOSJsonObject,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

/*
 * ============================================================
 * REQUEST TYPE
 * ============================================================
 */

type DeveloperPlanBody = {
  requestId?: unknown;

  instruction?: unknown;

  employee?: unknown;

  workspace?: unknown;

  paths?: unknown;

  searchQueries?: unknown;

  includeContents?: unknown;

  maximumFiles?: unknown;

  metadata?: unknown;
};

/*
 * ============================================================
 * LIMITS
 * ============================================================
 */

const MAXIMUM_INSTRUCTION_LENGTH =
  20_000;

const MAXIMUM_REQUEST_ID_LENGTH =
  200;

const MAXIMUM_PATH_LENGTH =
  500;

const MAXIMUM_SEARCH_QUERY_LENGTH =
  500;

const MAXIMUM_REQUESTED_PATHS =
  50;

const MAXIMUM_SEARCH_QUERIES =
  8;

/*
 * ============================================================
 * IDENTIFIERS
 * ============================================================
 */

function createIdentifier(
  prefix: string
): string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID ===
      "function"
  ) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

/*
 * ============================================================
 * TEXT VALIDATION
 * ============================================================
 */

function cleanRequiredText(
  value: unknown,
  fieldName: string,
  maximumLength: number
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  if (
    cleaned.length >
    maximumLength
  ) {
    throw new Error(
      `${fieldName} cannot exceed ${maximumLength.toLocaleString()} characters.`
    );
  }

  return cleaned;
}

function cleanOptionalText(
  value: unknown,
  maximumLength: number
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value
      .trim()
      .slice(
        0,
        maximumLength
      );

  return cleaned ||
    undefined;
}

/*
 * ============================================================
 * EMPLOYEE AND WORKSPACE
 * ============================================================
 */

function normalizeEmployee(
  value: unknown
): RoyalOSDeveloperEmployee {
  if (
    isRoyalOSDeveloperEmployee(
      value
    )
  ) {
    return value;
  }

  return "Orion";
}

function normalizeWorkspace(
  value: unknown
): RoyalOSWorkspace {
  if (
    isRoyalOSWorkspace(
      value
    )
  ) {
    return value;
  }

  return "Triple-Hay Concept LLC";
}

/*
 * ============================================================
 * BASIC VALUES
 * ============================================================
 */

function normalizeBoolean(
  value: unknown,
  defaultValue: boolean
): boolean {
  return typeof value ===
    "boolean"
    ? value
    : defaultValue;
}

function normalizeInteger(
  value: unknown,
  values: {
    minimum: number;
    maximum: number;
    defaultValue: number;
  }
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return values.defaultValue;
  }

  return Math.min(
    values.maximum,
    Math.max(
      values.minimum,
      Math.floor(value)
    )
  );
}

/*
 * ============================================================
 * PATH NORMALIZATION
 * ============================================================
 */

function normalizePath(
  value: string
): string {
  return value
    .trim()
    .replace(
      /\\/g,
      "/"
    )
    .replace(
      /^\.\/+/,
      ""
    )
    .slice(
      0,
      MAXIMUM_PATH_LENGTH
    );
}

function normalizePaths(
  value: unknown
): string[] | undefined {
  if (
    !Array.isArray(value)
  ) {
    return undefined;
  }

  const paths =
    Array.from(
      new Set(
        value.flatMap(
          (item) => {
            if (
              typeof item !==
              "string"
            ) {
              return [];
            }

            const cleaned =
              normalizePath(
                item
              );

            return cleaned
              ? [
                  cleaned,
                ]
              : [];
          }
        )
      )
    ).slice(
      0,
      MAXIMUM_REQUESTED_PATHS
    );

  return paths.length >
    0
    ? paths
    : undefined;
}

/*
 * ============================================================
 * SEARCH QUERY NORMALIZATION
 * ============================================================
 */

function normalizeSearchQueries(
  value: unknown
): string[] | undefined {
  if (
    !Array.isArray(value)
  ) {
    return undefined;
  }

  const queries =
    Array.from(
      new Set(
        value.flatMap(
          (item) => {
            if (
              typeof item !==
              "string"
            ) {
              return [];
            }

            const cleaned =
              item
                .trim()
                .slice(
                  0,
                  MAXIMUM_SEARCH_QUERY_LENGTH
                );

            return cleaned
              ? [
                  cleaned,
                ]
              : [];
          }
        )
      )
    ).slice(
      0,
      MAXIMUM_SEARCH_QUERIES
    );

  return queries.length >
    0
    ? queries
    : undefined;
}

/*
 * ============================================================
 * METADATA NORMALIZATION
 * ============================================================
 */

function normalizeMetadata(
  value: unknown
): RoyalOSJsonObject | undefined {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return undefined;
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const metadata:
    RoyalOSJsonObject = {};

  for (
    const [
      rawKey,
      rawValue,
    ] of Object.entries(
      source
    ).slice(
      0,
      30
    )
  ) {
    const key =
      rawKey
        .trim()
        .slice(
          0,
          100
        );

    if (!key) {
      continue;
    }

    if (
      typeof rawValue ===
      "string"
    ) {
      metadata[key] =
        rawValue.slice(
          0,
          1_000
        );

      continue;
    }

    if (
      typeof rawValue ===
        "number" &&
      Number.isFinite(
        rawValue
      )
    ) {
      metadata[key] =
        rawValue;

      continue;
    }

    if (
      typeof rawValue ===
        "boolean" ||
      rawValue === null
    ) {
      metadata[key] =
        rawValue;
    }
  }

  return Object.keys(
    metadata
  ).length > 0
    ? metadata
    : undefined;
}

/*
 * ============================================================
 * ERROR HANDLING
 * ============================================================
 */

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unknown Orion development-planning error.";
}

/*
 * ============================================================
 * GET — ENDPOINT STATUS
 * ============================================================
 */

export async function GET() {
  const policy =
    getRoyalOSDeveloperSecurityPolicy();

  return Response.json(
    {
      message:
        "Orion Developer Workbench planning API is online.",

      status:
        "ready",

      stage:
        "read-only-planning",

      capabilities: {
        analyzeDevelopmentRequest:
          true,

        inspectRelevantFiles:
          true,

        searchRelevantCode:
          true,

        identifyAffectedPaths:
          true,

        calculateRisk:
          true,

        routeSupportingEmployees:
          true,

        createImplementationPlan:
          true,

        prepareValidationCommands:
          true,

        prepareRollbackPlan:
          true,

        requestCEOApproval:
          true,

        generateCodeProposal:
          false,

        applyCodeChanges:
          false,

        writeFiles:
          false,

        deleteFiles:
          false,

        runTerminalCommands:
          false,

        installPackages:
          false,

        deployApplication:
          false,
      },

      limits: {
        maximumInstructionCharacters:
          MAXIMUM_INSTRUCTION_LENGTH,

        maximumRequestedPaths:
          MAXIMUM_REQUESTED_PATHS,

        maximumSearchQueries:
          MAXIMUM_SEARCH_QUERIES,

        maximumFilesPerRequest:
          policy
            .maximumFilesPerRequest,
      },

      security:
        getRoyalOSDeveloperSecuritySummary(),

      timestamp:
        new Date()
          .toISOString(),
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}

/*
 * ============================================================
 * POST — CREATE DEVELOPMENT PLAN
 * ============================================================
 */

export async function POST(
  request: Request
) {
  const startedAt =
    globalThis.performance.now();

  try {
    let body:
      DeveloperPlanBody;

    try {
      body =
        (await request.json()) as
          DeveloperPlanBody;
    } catch {
      return Response.json(
        {
          error:
            "Orion received invalid development-plan JSON.",
        },
        {
          status:
            400,
        }
      );
    }

    let instruction:
      string;

    try {
      instruction =
        cleanRequiredText(
          body.instruction,
          "Development instruction",
          MAXIMUM_INSTRUCTION_LENGTH
        );
    } catch (error) {
      return Response.json(
        {
          error:
            getErrorMessage(
              error
            ),
        },
        {
          status:
            400,
        }
      );
    }

    const policy =
      getRoyalOSDeveloperSecurityPolicy();

    const requestId =
      cleanOptionalText(
        body.requestId,
        MAXIMUM_REQUEST_ID_LENGTH
      ) ||
      createIdentifier(
        "developer_request"
      );

    const employee =
      normalizeEmployee(
        body.employee
      );

    const workspace =
      normalizeWorkspace(
        body.workspace
      );

    const paths =
      normalizePaths(
        body.paths
      );

    const searchQueries =
      normalizeSearchQueries(
        body.searchQueries
      );

    const includeContents =
      normalizeBoolean(
        body.includeContents,
        false
      );

    const maximumFiles =
      normalizeInteger(
        body.maximumFiles,
        {
          minimum:
            1,

          maximum:
            policy
              .maximumFilesPerRequest,

          defaultValue:
            Math.min(
              30,
              policy
                .maximumFilesPerRequest
            ),
        }
      );

    const planningResult =
      await createRoyalOSDeveloperPlan({
        requestId,

        instruction,

        employee,

        workspace,

        paths,

        searchQueries,

        includeContents,

        maximumFiles,

        metadata:
          normalizeMetadata(
            body.metadata
          ),
      });

    const totalRequestMs =
      Math.round(
        globalThis.performance.now() -
          startedAt
      );

    return Response.json(
      {
        message:
          planningResult
            .plan
            .requiresCEOApproval
            ? `${employee} prepared a controlled development plan for CEO review. No files were changed.`
            : `${employee} completed the read-only development analysis.`,

        stage:
          "read-only-planning",

        plan:
          planningResult.plan,

        inspection:
          planningResult.inspection,

        searches:
          planningResult.searches,

        groundedPaths:
          planningResult.groundedPaths,

        warnings:
          planningResult.warnings,

        security: {
          projectRoot:
            policy
              .projectRoot,

          readOnly:
            policy.readOnly,

          writesAllowed:
            policy
              .allowWrites,

          deletesAllowed:
            policy
              .allowDeletes,

          terminalAllowed:
            policy
              .allowTerminal,

          packageInstallationAllowed:
            policy
              .allowPackageInstallation,

          databaseChangesAllowed:
            policy
              .allowDatabaseChanges,

          CEOApprovalRequiredForWrites:
            policy
              .requireApprovalForWrites,

          backupsRequiredBeforeWrites:
            policy
              .requireBackupBeforeWrites,

          secretsProtected:
            true,
        },

        performance: {
          inspectionMs:
            planningResult
              .inspection
              .durationMs,

          searchesRun:
            planningResult
              .searches
              .length,

          totalRequestMs,
        },
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const errorMessage =
      getErrorMessage(
        error
      );

    console.error(
      "Orion developer planning error:",
      error
    );

    return Response.json(
      {
        error:
          "Orion could not create the development plan.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? errorMessage
            : undefined,

        stage:
          "read-only-planning",

        durationMs:
          Math.round(
            globalThis.performance.now() -
              startedAt
          ),
      },
      {
        status:
          500,
      }
    );
  }
}