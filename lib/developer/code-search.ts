import "server-only";

import {
  getRoyalOSDeveloperSecurityPolicy,
} from "@/lib/developer/security";

import {
  listRoyalOSDeveloperFiles,
  readRoyalOSDeveloperFile,
} from "@/lib/developer/project-reader";

import type {
  RoyalOSDeveloperFileReference,
  RoyalOSDeveloperLanguage,
  RoyalOSDeveloperSearchMatch,
  RoyalOSDeveloperSearchRequest,
  RoyalOSDeveloperSearchResult,
  RoyalOSDeveloperSecurityPolicy,
} from "@/lib/developer/types";

/*
 * ============================================================
 * PUBLIC SEARCH OPTIONS
 * ============================================================
 */

export type SearchRoyalOSDeveloperCodeOptions = {
  policy?:
    RoyalOSDeveloperSecurityPolicy;

  maximumFiles?:
    number;

  maximumCharactersPerFile?:
    number;
};

export type SearchRoyalOSDeveloperFileInput = {
  query: string;

  relativePath:
    string;

  caseSensitive?:
    boolean;

  useRegularExpression?:
    boolean;

  maximumResults?:
    number;

  contextLines?:
    number;

  policy?:
    RoyalOSDeveloperSecurityPolicy;
};

/*
 * ============================================================
 * INTERNAL TYPES
 * ============================================================
 */

type PreparedSearch = {
  originalQuery:
    string;

  normalizedQuery:
    string;

  caseSensitive:
    boolean;

  useRegularExpression:
    boolean;

  expression:
    RegExp | null;
};

type SearchFileResult = {
  matches:
    RoyalOSDeveloperSearchMatch[];

  truncated:
    boolean;
};

/*
 * ============================================================
 * LIMITS
 * ============================================================
 */

const MAXIMUM_QUERY_LENGTH =
  500;

const DEFAULT_MAXIMUM_RESULTS =
  100;

const HARD_MAXIMUM_RESULTS =
  500;

const DEFAULT_CONTEXT_LINES =
  2;

const HARD_MAXIMUM_CONTEXT_LINES =
  10;

const DEFAULT_MAXIMUM_CHARACTERS_PER_FILE =
  200_000;

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function cleanRequiredText(
  value: unknown,
  fieldName: string,
  maximumLength:
    number
): string {
  const cleaned =
    typeof value ===
      "string"
      ? value.trim()
      : "";

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required for Orion code search.`
    );
  }

  if (
    cleaned.length >
    maximumLength
  ) {
    throw new Error(
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return cleaned;
}

function normalizeMaximumResults(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return DEFAULT_MAXIMUM_RESULTS;
  }

  return Math.min(
    HARD_MAXIMUM_RESULTS,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

function normalizeContextLines(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return DEFAULT_CONTEXT_LINES;
  }

  return Math.min(
    HARD_MAXIMUM_CONTEXT_LINES,
    Math.max(
      0,
      Math.floor(value)
    )
  );
}

function normalizeMaximumFiles(
  value: number | undefined,
  policy:
    RoyalOSDeveloperSecurityPolicy
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return policy
      .maximumFilesPerRequest;
  }

  return Math.min(
    policy.maximumFilesPerRequest,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

function normalizeMaximumCharactersPerFile(
  value: number | undefined,
  policy:
    RoyalOSDeveloperSecurityPolicy
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return Math.min(
      DEFAULT_MAXIMUM_CHARACTERS_PER_FILE,
      policy.maximumReadCharacters
    );
  }

  return Math.min(
    policy.maximumReadCharacters,
    Math.max(
      1_000,
      Math.floor(value)
    )
  );
}

function createRequestId():
  string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID ===
      "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return `developer_search_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function normalizeExtension(
  value: string
): string {
  const cleaned =
    value
      .trim()
      .toLowerCase();

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
  values:
    string[] | undefined
): Set<string> {
  if (
    !values ||
    values.length === 0
  ) {
    return new Set();
  }

  return new Set(
    values
      .map(
        normalizeExtension
      )
      .filter(Boolean)
  );
}

function splitLines(
  content: string
): string[] {
  return content.split(
    /\r\n|\r|\n/
  );
}

function cloneStringArray(
  values: string[]
): string[] {
  return [
    ...values,
  ];
}

/*
 * ============================================================
 * REGULAR EXPRESSION SECURITY
 * ============================================================
 */

function containsPotentiallyUnsafeRegularExpression(
  source: string
): boolean {
  /*
   * This is not a complete regex security engine.
   *
   * It blocks common nested-quantifier patterns that can cause
   * excessive backtracking on large source files.
   */

  const nestedQuantifiers = [
    /\([^)]*[+*][^)]*\)[+*{]/,
    /\[[^\]]*\][+*]\s*[+*{]/,
    /\.\*\.\*/,
    /\.\+\.\+/,
  ];

  return nestedQuantifiers.some(
    (pattern) =>
      pattern.test(
        source
      )
  );
}

function prepareSearch(
  query: string,
  values: {
    caseSensitive:
      boolean;

    useRegularExpression:
      boolean;
  }
): PreparedSearch {
  const originalQuery =
    cleanRequiredText(
      query,
      "Search query",
      MAXIMUM_QUERY_LENGTH
    );

  if (
    values.useRegularExpression
  ) {
    if (
      containsPotentiallyUnsafeRegularExpression(
        originalQuery
      )
    ) {
      throw new Error(
        "The regular expression contains a potentially unsafe nested pattern."
      );
    }

    try {
      const expression =
        new RegExp(
          originalQuery,
          values.caseSensitive
            ? ""
            : "i"
        );

      return {
        originalQuery,

        normalizedQuery:
          originalQuery,

        caseSensitive:
          values.caseSensitive,

        useRegularExpression:
          true,

        expression,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The regular expression is invalid.";

      throw new Error(
        `RoyalOS could not compile the regular expression: ${message}`
      );
    }
  }

  return {
    originalQuery,

    normalizedQuery:
      values.caseSensitive
        ? originalQuery
        : originalQuery.toLowerCase(),

    caseSensitive:
      values.caseSensitive,

    useRegularExpression:
      false,

    expression:
      null,
  };
}

/*
 * ============================================================
 * FILE FILTERING
 * ============================================================
 */

function isFileIncludedByExtension(
  file:
    RoyalOSDeveloperFileReference,
  allowedExtensions:
    Set<string>
): boolean {
  if (
    allowedExtensions.size ===
    0
  ) {
    return true;
  }

  return allowedExtensions.has(
    file.extension.toLowerCase()
  );
}

function isSearchableLanguage(
  language:
    RoyalOSDeveloperLanguage
): boolean {
  return language !==
    "unknown";
}

function filterSearchableFiles(
  files:
    RoyalOSDeveloperFileReference[],
  extensions:
    Set<string>
): {
  included:
    RoyalOSDeveloperFileReference[];

  skipped:
    RoyalOSDeveloperFileReference[];
} {
  const included:
    RoyalOSDeveloperFileReference[] = [];

  const skipped:
    RoyalOSDeveloperFileReference[] = [];

  for (
    const file of files
  ) {
    if (
      !file.readable ||
      !isSearchableLanguage(
        file.language
      ) ||
      !isFileIncludedByExtension(
        file,
        extensions
      )
    ) {
      skipped.push(
        file
      );

      continue;
    }

    included.push(
      file
    );
  }

  return {
    included,

    skipped,
  };
}

/*
 * ============================================================
 * LINE MATCHING
 * ============================================================
 */

function findLiteralMatch(
  line: string,
  prepared:
    PreparedSearch
): {
  index: number;
  match: string;
} | null {
  const searchableLine =
    prepared.caseSensitive
      ? line
      : line.toLowerCase();

  const index =
    searchableLine.indexOf(
      prepared.normalizedQuery
    );

  if (
    index < 0
  ) {
    return null;
  }

  return {
    index,

    match:
      line.slice(
        index,
        index +
          prepared.originalQuery
            .length
      ),
  };
}

function findRegularExpressionMatch(
  line: string,
  prepared:
    PreparedSearch
): {
  index: number;
  match: string;
} | null {
  if (
    !prepared.expression
  ) {
    return null;
  }

  /*
   * Create a fresh expression so lastIndex can never leak from
   * one source line into the next.
   */

  const expression =
    new RegExp(
      prepared.expression.source,
      prepared.expression.flags
    );

  const result =
    expression.exec(
      line
    );

  if (!result) {
    return null;
  }

  return {
    index:
      result.index,

    match:
      result[0] ||
      "",
  };
}

function findLineMatch(
  line: string,
  prepared:
    PreparedSearch
): {
  index: number;
  match: string;
} | null {
  return prepared
    .useRegularExpression
    ? findRegularExpressionMatch(
        line,
        prepared
      )
    : findLiteralMatch(
        line,
        prepared
      );
}

function getContextBefore(
  lines: string[],
  lineIndex: number,
  contextLines: number
): string[] {
  const startIndex =
    Math.max(
      0,
      lineIndex -
        contextLines
    );

  return cloneStringArray(
    lines.slice(
      startIndex,
      lineIndex
    )
  );
}

function getContextAfter(
  lines: string[],
  lineIndex: number,
  contextLines: number
): string[] {
  return cloneStringArray(
    lines.slice(
      lineIndex + 1,
      lineIndex +
        contextLines +
        1
    )
  );
}

/*
 * ============================================================
 * SEARCH ONE LOADED FILE
 * ============================================================
 */

function searchLoadedFile(
  values: {
    relativePath:
      string;

    language:
      RoyalOSDeveloperLanguage;

    content:
      string;

    prepared:
      PreparedSearch;

    contextLines:
      number;

    maximumResults:
      number;
  }
): SearchFileResult {
  const lines =
    splitLines(
      values.content
    );

  const matches:
    RoyalOSDeveloperSearchMatch[] = [];

  let truncated =
    false;

  for (
    let lineIndex = 0;
    lineIndex <
      lines.length;
    lineIndex += 1
  ) {
    if (
      matches.length >=
      values.maximumResults
    ) {
      truncated =
        true;

      break;
    }

    const line =
      lines[
        lineIndex
      ];

    const found =
      findLineMatch(
        line,
        values.prepared
      );

    if (!found) {
      continue;
    }

    matches.push({
      relativePath:
        values.relativePath,

      lineNumber:
        lineIndex + 1,

      columnNumber:
        found.index + 1,

      line,

      before:
        getContextBefore(
          lines,
          lineIndex,
          values.contextLines
        ),

      after:
        getContextAfter(
          lines,
          lineIndex,
          values.contextLines
        ),

      match:
        found.match,

      language:
        values.language,
    });
  }

  return {
    matches,

    truncated,
  };
}

/*
 * ============================================================
 * SEARCH ONE PROJECT FILE
 * ============================================================
 */

export async function searchRoyalOSDeveloperFile(
  input:
    SearchRoyalOSDeveloperFileInput
): Promise<SearchFileResult> {
  const policy =
    input.policy ??
    getRoyalOSDeveloperSecurityPolicy();

  const prepared =
    prepareSearch(
      input.query,
      {
        caseSensitive:
          input.caseSensitive ??
          false,

        useRegularExpression:
          input.useRegularExpression ??
          false,
      }
    );

  const maximumResults =
    normalizeMaximumResults(
      input.maximumResults
    );

  const contextLines =
    normalizeContextLines(
      input.contextLines
    );

  const content =
    await readRoyalOSDeveloperFile(
      input.relativePath,
      {
        policy,

        maximumCharacters:
          policy
            .maximumReadCharacters,

        includeSha256:
          false,
      }
    );

  return searchLoadedFile({
    relativePath:
      content.file
        .relativePath,

    language:
      content.file.language,

    content:
      content.content,

    prepared,

    contextLines,

    maximumResults,
  });
}

/*
 * ============================================================
 * MAIN PROJECT SEARCH
 * ============================================================
 */

export async function searchRoyalOSDeveloperCode(
  request:
    RoyalOSDeveloperSearchRequest,
  options:
    SearchRoyalOSDeveloperCodeOptions = {}
): Promise<RoyalOSDeveloperSearchResult> {
  const startedAt =
    globalThis.performance.now();

  const policy =
    options.policy ??
    getRoyalOSDeveloperSecurityPolicy();

  const requestId =
    typeof request
      .requestId ===
      "string" &&
    request.requestId.trim()
      ? request
          .requestId
          .trim()
      : createRequestId();

  const prepared =
    prepareSearch(
      request.query,
      {
        caseSensitive:
          request.caseSensitive ??
          false,

        useRegularExpression:
          request.useRegularExpression ??
          false,
      }
    );

  const maximumResults =
    normalizeMaximumResults(
      request.maximumResults
    );

  const contextLines =
    normalizeContextLines(
      request.contextLines
    );

  const maximumFiles =
    normalizeMaximumFiles(
      options.maximumFiles,
      policy
    );

  const maximumCharactersPerFile =
    normalizeMaximumCharactersPerFile(
      options
        .maximumCharactersPerFile,
      policy
    );

  const extensionFilter =
    normalizeExtensions(
      request.extensions
    );

  const listing =
    await listRoyalOSDeveloperFiles({
      paths:
        request.paths,

      maximumDepth:
        12,

      maximumFiles,

      includeTree:
        false,

      policy,
    });

  const filteredFiles =
    filterSearchableFiles(
      listing.files,
      extensionFilter
    );

  const matches:
    RoyalOSDeveloperSearchMatch[] = [];

  const warnings = [
    ...listing.warnings,
  ];

  let searchedFiles =
    0;

  let skippedFiles =
    filteredFiles
      .skipped
      .length +
    listing.blockedPaths
      .length;

  let truncated =
    listing.truncated;

  for (
    const file of
    filteredFiles.included
  ) {
    if (
      matches.length >=
      maximumResults
    ) {
      truncated =
        true;

      break;
    }

    try {
      const content =
        await readRoyalOSDeveloperFile(
          file.relativePath,
          {
            policy,

            maximumCharacters:
              maximumCharactersPerFile,

            includeSha256:
              false,
          }
        );

      searchedFiles +=
        1;

      if (
        content.truncated
      ) {
        warnings.push(
          `"${file.relativePath}" was truncated before searching.`
        );
      }

      const remainingResults =
        maximumResults -
        matches.length;

      const fileSearch =
        searchLoadedFile({
          relativePath:
            file.relativePath,

          language:
            file.language,

          content:
            content.content,

          prepared,

          contextLines,

          maximumResults:
            remainingResults,
        });

      matches.push(
        ...fileSearch.matches
      );

      if (
        fileSearch.truncated
      ) {
        truncated =
          true;
      }
    } catch (error) {
      skippedFiles +=
        1;

      warnings.push(
        `"${file.relativePath}" was skipped: ${
          error instanceof Error
            ? error.message
            : "The file could not be searched."
        }`
      );
    }
  }

  if (
    matches.length >=
    maximumResults
  ) {
    truncated =
      true;

    warnings.push(
      `Orion stopped after reaching the approved limit of ${maximumResults} search results.`
    );
  }

  if (
    extensionFilter.size >
      0 &&
    filteredFiles
      .included
      .length ===
      0
  ) {
    warnings.push(
      "No approved project files matched the requested extension filter."
    );
  }

  const durationMs =
    Math.round(
      globalThis.performance.now() -
        startedAt
    );

  return {
    requestId,

    query:
      prepared.originalQuery,

    status:
      "succeeded",

    matches,

    searchedFiles,

    skippedFiles,

    truncated,

    warnings,

    searchedAt:
      new Date()
        .toISOString(),

    durationMs,
  };
}

/*
 * ============================================================
 * CONVENIENCE SEARCH HELPERS
 * ============================================================
 */

export async function findRoyalOSDeveloperSymbol(
  symbol: string,
  paths?: string[]
): Promise<RoyalOSDeveloperSearchResult> {
  return searchRoyalOSDeveloperCode({
    requestId:
      createRequestId(),

    query:
      cleanRequiredText(
        symbol,
        "Developer symbol",
        200
      ),

    employee:
      "Orion",

    workspace:
      "Triple-Hay Concept LLC",

    paths,

    extensions: [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
    ],

    caseSensitive:
      true,

    useRegularExpression:
      false,

    maximumResults:
      100,

    contextLines:
      3,
  });
}

export async function findRoyalOSDeveloperImports(
  importPath: string,
  paths?: string[]
): Promise<RoyalOSDeveloperSearchResult> {
  return searchRoyalOSDeveloperCode({
    requestId:
      createRequestId(),

    query:
      cleanRequiredText(
        importPath,
        "Import path",
        300
      ),

    employee:
      "Orion",

    workspace:
      "Triple-Hay Concept LLC",

    paths,

    extensions: [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
    ],

    caseSensitive:
      true,

    useRegularExpression:
      false,

    maximumResults:
      100,

    contextLines:
      2,
  });
}

export async function findRoyalOSDeveloperRoutes():
  Promise<RoyalOSDeveloperSearchResult> {
  return searchRoyalOSDeveloperCode({
    requestId:
      createRequestId(),

    query:
      "export\\s+(?:async\\s+)?function\\s+(?:GET|POST|PUT|PATCH|DELETE)",

    employee:
      "Orion",

    workspace:
      "Triple-Hay Concept LLC",

    paths: [
      "app/api",
    ],

    extensions: [
      ".ts",
      ".tsx",
    ],

    caseSensitive:
      true,

    useRegularExpression:
      true,

    maximumResults:
      200,

    contextLines:
      2,
  });
}