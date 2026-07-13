import {
  createRoyalOSDeveloperProposal,
} from "@/lib/developer/proposer";

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
  300;

/*
 * ============================================================
 * REQUEST TYPE
 * ============================================================
 */

type DeveloperProposalBody = {
  requestId?: unknown;

  instruction?: unknown;

  employee?: unknown;

  workspace?: unknown;

  paths?: unknown;

  searchQueries?: unknown;

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
  8;

const MAXIMUM_SEARCH_QUERIES =
  8;

const MAXIMUM_PROPOSAL_FILES =
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
 * TEXT HELPERS
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
 * NUMBER NORMALIZATION
 * ============================================================
 */

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
              ? [cleaned]
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
 * SEARCH QUERIES
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
              ? [cleaned]
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
 * METADATA
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
    : "Unknown Orion code-proposal error.";
}

function getErrorStatus(
  errorMessage: string
): number {
  const normalized =
    errorMessage.toLowerCase();

  if (
    normalized.includes(
      "openai_api_key"
    ) ||
    normalized.includes(
      "not configured"
    )
  ) {
    return 503;
  }

  if (
    normalized.includes(
      "required"
    ) ||
    normalized.includes(
      "cannot exceed"
    ) ||
    normalized.includes(
      "outside the approved"
    ) ||
    normalized.includes(
      "could not identify"
    ) ||
    normalized.includes(
      "could not read any"
    ) ||
    normalized.includes(
      "classified as read-only"
    ) ||
    normalized.includes(
      "empty code proposal"
    ) ||
    normalized.includes(
      "duplicate changes"
    ) ||
    normalized.includes(
      "file proposal limit"
    )
  ) {
    return 400;
  }

  return 500;
}

/*
 * ============================================================
 * GET — ENDPOINT STATUS
 * ============================================================
 */

export async function GET() {
  const policy =
    getRoyalOSDeveloperSecurityPolicy();

  const model =
    process.env
      .OPENAI_DEVELOPER_MODEL
      ?.trim() ||
    process.env
      .OPENAI_MODEL
      ?.trim() ||
    "gpt-5.6";

  return Response.json(
    {
      message:
        "Orion Developer Workbench code-proposal API is online.",

      status:
        process.env
          .OPENAI_API_KEY
          ?.trim()
          ? "ready"
          : "not_ready",

      stage:
        "code-proposal",

      model,

      capabilities: {
        inspectBeforeProposal:
          true,

        searchBeforeProposal:
          true,

        readApprovedFiles:
          true,

        generateCompleteFileCode:
          true,

        preserveOriginalContent:
          true,

        preserveOriginalHashes:
          true,

        prepareValidationCommands:
          true,

        prepareRollbackInstructions:
          true,

        requireCEOApproval:
          true,

        applyCodeChanges:
          false,

        writeFiles:
          false,

        deleteFiles:
          false,

        renameFiles:
          false,

        runTerminalCommands:
          false,

        installPackages:
          false,

        changeDatabase:
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

        maximumProposedFiles:
          MAXIMUM_PROPOSAL_FILES,
      },

      security:
        getRoyalOSDeveloperSecuritySummary(),

      timestamp:
        new Date()
          .toISOString(),
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}

/*
 * ============================================================
 * POST — GENERATE CODE PROPOSAL
 * ============================================================
 */

export async function POST(
  request: Request
) {
  const startedAt =
    globalThis.performance.now();

  try {
    let body:
      DeveloperProposalBody;

    try {
      body =
        (await request.json()) as
          DeveloperProposalBody;
    } catch {
      return Response.json(
        {
          error:
            "Orion received invalid code-proposal JSON.",

          stage:
            "code-proposal",
        },
        {
          status: 400,
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

          stage:
            "code-proposal",
        },
        {
          status: 400,
        }
      );
    }

    const policy =
      getRoyalOSDeveloperSecurityPolicy();

    /*
     * Proposal mode must remain unable to write.
     */
    if (
      !policy.readOnly ||
      policy.allowWrites ||
      policy.allowDeletes ||
      policy.allowTerminal
    ) {
      return Response.json(
        {
          error:
            "RoyalOS refused proposal mode because the Developer Workbench security policy is not read-only.",

          stage:
            "code-proposal",
        },
        {
          status: 403,
        }
      );
    }

    const requestId =
      cleanOptionalText(
        body.requestId,
        MAXIMUM_REQUEST_ID_LENGTH
      ) ||
      createIdentifier(
        "developer_proposal_request"
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

    const maximumFiles =
      normalizeInteger(
        body.maximumFiles,
        {
          minimum: 1,

          maximum:
            MAXIMUM_PROPOSAL_FILES,

          defaultValue:
            MAXIMUM_PROPOSAL_FILES,
        }
      );

    const proposal =
      await createRoyalOSDeveloperProposal({
        requestId,

        instruction,

        employee,

        workspace,

        paths,

        searchQueries,

        maximumFiles,

        metadata: {
          ...normalizeMetadata(
            body.metadata
          ),

          endpoint:
            "/api/developer/propose",

          stage:
            "code-proposal",

          requestedBy:
            "Ayobami",

          requestedAt:
            new Date()
              .toISOString(),
        },
      });

    const totalRequestMs =
      Math.round(
        globalThis.performance.now() -
          startedAt
      );

    return Response.json(
      {
        message:
          `${employee} prepared a complete code proposal for CEO review. No project files were changed.`,

        stage:
          "code-proposal",

        proposal,

        approval: {
          required:
            true,

          status:
            "pending",

          approved:
            false,

          applied:
            false,

          decidedBy:
            null,

          decidedAt:
            null,
        },

        security: {
          readOnly:
            policy.readOnly,

          writesAllowed:
            policy.allowWrites,

          deletesAllowed:
            policy.allowDeletes,

          terminalAllowed:
            policy.allowTerminal,

          packageInstallationAllowed:
            policy.allowPackageInstallation,

          databaseChangesAllowed:
            policy.allowDatabaseChanges,

          approvalRequired:
            policy.requireApprovalForWrites,

          backupRequired:
            policy.requireBackupBeforeWrites,

          secretsProtected:
            true,
        },

        performance: {
          proposalDurationMs:
            proposal.durationMs,

          analyzedFiles:
            proposal
              .analyzedFiles
              .length,

          proposedChanges:
            proposal
              .changes
              .length,

          totalRequestMs,
        },
      },
      {
        status: 200,

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

    const status =
      getErrorStatus(
        errorMessage
      );

    console.error(
      "Orion developer proposal error:",
      error
    );

    return Response.json(
      {
        error:
          status === 500
            ? "Orion could not generate the code proposal."
            : errorMessage,

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? errorMessage
            : undefined,

        stage:
          "code-proposal",

        filesChanged:
          false,

        durationMs:
          Math.round(
            globalThis.performance.now() -
              startedAt
          ),
      },
      {
        status,
      }
    );
  }
}