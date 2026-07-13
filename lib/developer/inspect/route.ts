import {
  getRoyalOSDeveloperSecurityPolicy,
  getRoyalOSDeveloperSecuritySummary,
} from "@/lib/developer/security";

import {
  inspectRoyalOSDeveloperProject,
} from "@/lib/developer/project-reader";

import {
  isRoyalOSDeveloperEmployee,
  type RoyalOSDeveloperEmployee,
} from "@/lib/developer/types";

import {
  isRoyalOSWorkspace,
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
 * REQUEST TYPES
 * ============================================================
 */

type DeveloperInspectionBody = {
  requestId?: unknown;

  instruction?: unknown;

  employee?: unknown;

  workspace?: unknown;

  paths?: unknown;

  includeTree?: unknown;

  includeContents?: unknown;

  maximumDepth?: unknown;

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

const MAXIMUM_PATH_LENGTH =
  500;

const MAXIMUM_REQUESTED_PATHS =
  50;

/*
 * ============================================================
 * HELPERS
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
        value
          .flatMap(
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

function normalizeMetadata(
  value: unknown
): Record<
  string,
  string | number | boolean | null
> | undefined {
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
    Record<
      string,
      string | number | boolean | null
    > = {};

  for (
    const [
      key,
      item,
    ] of Object.entries(
      source
    ).slice(
      0,
      30
    )
  ) {
    const safeKey =
      key
        .trim()
        .slice(
          0,
          100
        );

    if (!safeKey) {
      continue;
    }

    if (
      typeof item ===
        "string"
    ) {
      metadata[
        safeKey
      ] = item.slice(
        0,
        1_000
      );

      continue;
    }

    if (
      typeof item ===
        "number" &&
      Number.isFinite(item)
    ) {
      metadata[
        safeKey
      ] = item;

      continue;
    }

    if (
      typeof item ===
        "boolean" ||
      item === null
    ) {
      metadata[
        safeKey
      ] = item;
    }
  }

  return Object.keys(
    metadata
  ).length > 0
    ? metadata
    : undefined;
}

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unknown Orion inspection error.";
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
        "Orion Developer Workbench inspection API is online.",

      status:
        "ready",

      stage:
        "read-only",

      capabilities: {
        inspectProjectTree:
          true,

        listApprovedFiles:
          true,

        readApprovedSourceFiles:
          true,

        calculateFileHashes:
          true,

        detectFramework:
          true,

        detectPackageManager:
          true,

        redactDetectedSecrets:
          true,

        writeFiles:
          false,

        deleteFiles:
          false,

        runTerminalCommands:
          false,

        installPackages:
          false,

        changeDatabase:
          false,
      },

      projectRoot:
        policy.projectRoot,

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
 * POST — INSPECT PROJECT
 * ============================================================
 */

export async function POST(
  request: Request
) {
  const startedAt =
    globalThis.performance.now();

  try {
    let body:
      DeveloperInspectionBody;

    try {
      body =
        (await request.json()) as
          DeveloperInspectionBody;
    } catch {
      return Response.json(
        {
          error:
            "Orion received invalid inspection JSON.",
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
          "Developer inspection instruction",
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
        200
      ) ||
      createIdentifier(
        "developer_inspection"
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

    const includeTree =
      normalizeBoolean(
        body.includeTree,
        true
      );

    /*
     * Source contents remain disabled unless explicitly requested.
     */
    const includeContents =
      normalizeBoolean(
        body.includeContents,
        false
      );

    const maximumDepth =
      normalizeInteger(
        body.maximumDepth,
        {
          minimum:
            0,

          maximum:
            12,

          defaultValue:
            paths
              ? 5
              : 3,
        }
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

    const result =
      await inspectRoyalOSDeveloperProject({
        requestId,

        instruction,

        employee,

        workspace,

        paths,

        includeTree,

        includeContents,

        maximumDepth,

        maximumFiles,

        metadata:
          normalizeMetadata(
            body.metadata
          ),
      });

    const totalDurationMs =
      Math.round(
        globalThis.performance.now() -
          startedAt
      );

    return Response.json(
      {
        message:
          `${employee} completed the read-only project inspection.`,

        stage:
          "read-only",

        inspection:
          result,

        security: {
          projectRoot:
            policy.projectRoot,

          writesAllowed:
            policy.allowWrites,

          deletesAllowed:
            policy.allowDeletes,

          terminalAllowed:
            policy.allowTerminal,

          secretsProtected:
            true,
        },

        performance: {
          inspectionDurationMs:
            result.durationMs,

          totalRequestMs:
            totalDurationMs,
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
      "Orion developer inspection error:",
      error
    );

    return Response.json(
      {
        error:
          "Orion could not complete the project inspection.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? errorMessage
            : undefined,

        stage:
          "read-only",

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