import {
  searchRoyalOSDeveloperCode,
} from "@/lib/developer/code-search";

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

type DeveloperSearchBody = {
  requestId?: unknown;

  query?: unknown;

  employee?: unknown;

  workspace?: unknown;

  paths?: unknown;

  extensions?: unknown;

  caseSensitive?: unknown;

  useRegularExpression?: unknown;

  maximumResults?: unknown;

  contextLines?: unknown;

  maximumFiles?: unknown;

  maximumCharactersPerFile?: unknown;

  metadata?: unknown;
};

/*
 * ============================================================
 * LIMITS
 * ============================================================
 */

const MAXIMUM_QUERY_LENGTH =
  500;

const MAXIMUM_REQUEST_ID_LENGTH =
  200;

const MAXIMUM_PATH_LENGTH =
  500;

const MAXIMUM_EXTENSION_LENGTH =
  20;

const MAXIMUM_REQUESTED_PATHS =
  50;

const MAXIMUM_EXTENSIONS =
  30;

const HARD_MAXIMUM_RESULTS =
  500;

const HARD_MAXIMUM_CONTEXT_LINES =
  10;

/*
 * ============================================================
 * GENERAL HELPERS
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

function normalizeExtension(
  value: string
): string {
  const cleaned =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9.]/g,
        ""
      )
      .slice(
        0,
        MAXIMUM_EXTENSION_LENGTH
      );

  if (!cleaned) {
    return "";
  }

  return cleaned.startsWith(
    "."
  )
    ? cleaned
    : `.${cleaned}`;
}

function normalizeExtensions(
  value: unknown
): string[] | undefined {
  if (
    !Array.isArray(value)
  ) {
    return undefined;
  }

  const extensions =
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
              normalizeExtension(
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
      MAXIMUM_EXTENSIONS
    );

  return extensions.length >
    0
    ? extensions
    : undefined;
}

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

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unknown Orion code-search error.";
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
        "Orion Developer Workbench code-search API is online.",

      status:
        "ready",

      stage:
        "read-only",

      capabilities: {
        literalSearch:
          true,

        regularExpressionSearch:
          true,

        pathFiltering:
          true,

        extensionFiltering:
          true,

        caseSensitiveSearch:
          true,

        lineNumbers:
          true,

        columnNumbers:
          true,

        surroundingContext:
          true,

        secretProtection:
          true,

        writeFiles:
          false,

        deleteFiles:
          false,

        runTerminalCommands:
          false,
      },

      limits: {
        maximumQueryCharacters:
          MAXIMUM_QUERY_LENGTH,

        maximumResults:
          HARD_MAXIMUM_RESULTS,

        maximumContextLines:
          HARD_MAXIMUM_CONTEXT_LINES,

        maximumFilesPerRequest:
          policy
            .maximumFilesPerRequest,

        maximumReadCharacters:
          policy
            .maximumReadCharacters,
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
 * POST — SEARCH PROJECT CODE
 * ============================================================
 */

export async function POST(
  request: Request
) {
  const startedAt =
    globalThis.performance.now();

  try {
    let body:
      DeveloperSearchBody;

    try {
      body =
        (await request.json()) as
          DeveloperSearchBody;
    } catch {
      return Response.json(
        {
          error:
            "Orion received invalid code-search JSON.",
        },
        {
          status:
            400,
        }
      );
    }

    let query:
      string;

    try {
      query =
        cleanRequiredText(
          body.query,
          "Code-search query",
          MAXIMUM_QUERY_LENGTH
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
        "developer_search"
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

    const extensions =
      normalizeExtensions(
        body.extensions
      );

    const caseSensitive =
      normalizeBoolean(
        body.caseSensitive,
        false
      );

    const useRegularExpression =
      normalizeBoolean(
        body.useRegularExpression,
        false
      );

    const maximumResults =
      normalizeInteger(
        body.maximumResults,
        {
          minimum:
            1,

          maximum:
            HARD_MAXIMUM_RESULTS,

          defaultValue:
            100,
        }
      );

    const contextLines =
      normalizeInteger(
        body.contextLines,
        {
          minimum:
            0,

          maximum:
            HARD_MAXIMUM_CONTEXT_LINES,

          defaultValue:
            2,
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
            policy
              .maximumFilesPerRequest,
        }
      );

    const maximumCharactersPerFile =
      normalizeInteger(
        body.maximumCharactersPerFile,
        {
          minimum:
            1_000,

          maximum:
            policy
              .maximumReadCharacters,

          defaultValue:
            Math.min(
              200_000,
              policy
                .maximumReadCharacters
            ),
        }
      );

    const result =
      await searchRoyalOSDeveloperCode(
        {
          requestId,

          query,

          employee,

          workspace,

          paths,

          extensions,

          caseSensitive,

          useRegularExpression,

          maximumResults,

          contextLines,

          metadata:
            normalizeMetadata(
              body.metadata
            ),
        },
        {
          policy,

          maximumFiles,

          maximumCharactersPerFile,
        }
      );

    const totalRequestMs =
      Math.round(
        globalThis.performance.now() -
          startedAt
      );

    return Response.json(
      {
        message:
          `${employee} completed the read-only RoyalOS code search.`,

        stage:
          "read-only",

        search:
          result,

        filters: {
          paths:
            paths ??
            [],

          extensions:
            extensions ??
            [],

          caseSensitive,

          useRegularExpression,

          maximumResults,

          contextLines,

          maximumFiles,

          maximumCharactersPerFile,
        },

        security: {
          projectRoot:
            policy
              .projectRoot,

          writesAllowed:
            policy
              .allowWrites,

          deletesAllowed:
            policy
              .allowDeletes,

          terminalAllowed:
            policy
              .allowTerminal,

          secretsProtected:
            true,
        },

        performance: {
          searchDurationMs:
            result
              .durationMs,

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
      "Orion developer code-search error:",
      error
    );

    return Response.json(
      {
        error:
          "Orion could not complete the project code search.",

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