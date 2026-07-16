import "server-only";

import OpenAI from "openai";

import {
  createHash,
} from "node:crypto";

import {
  createRoyalOSDeveloperPlan,
  type CreateRoyalOSDeveloperPlanRequest,
} from "@/lib/developer/planner";

import {
  readRoyalOSDeveloperFiles,
} from "@/lib/developer/project-reader";

import {
  evaluateRoyalOSDeveloperPathSecurely,
  getRoyalOSDeveloperSecurityPolicy,
} from "@/lib/developer/security";

import type {
  RoyalOSDeveloperChangeType,
  RoyalOSDeveloperEmployee,
  RoyalOSDeveloperFileContent,
  RoyalOSDeveloperPlan,
  RoyalOSDeveloperProposedChange,
  RoyalOSDeveloperRiskLevel,
} from "@/lib/developer/types";

import type {
  RoyalOSJsonObject,
  RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * PUBLIC TYPES
 * ============================================================
 */

export type CreateRoyalOSDeveloperProposalRequest = {
  requestId?: string;

  instruction: string;

  employee?: RoyalOSDeveloperEmployee;

  workspace: RoyalOSWorkspace;

  paths?: string[];

  searchQueries?: string[];

  maximumFiles?: number;

  metadata?: RoyalOSJsonObject;
};

export type RoyalOSDeveloperProposalResult = {
  requestId: string;

  proposalId: string;

  plan: RoyalOSDeveloperPlan;

  changes:
    RoyalOSDeveloperProposedChange[];

  analyzedFiles:
    RoyalOSDeveloperFileContent[];

  blockedPaths:
    Array<{
      path: string;
      reason: string;
    }>;

  warnings: string[];

  model: string;

  createdAt: string;

  durationMs: number;
};

/*
 * ============================================================
 * MODEL RESPONSE TYPES
 * ============================================================
 */

type ModelProposedChange = {
  relativePath?: unknown;

  changeType?: unknown;

  summary?: unknown;

  reason?: unknown;

  proposedContent?: unknown;

  riskLevel?: unknown;

  validationCommands?: unknown;

  rollbackInstructions?: unknown;
};

type ModelProposalPayload = {
  summary?: unknown;

  changes?: unknown;
};

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const MAXIMUM_INSTRUCTION_LENGTH =
  20_000;

const MAXIMUM_FILES_FOR_PROPOSAL =
  8;

const MAXIMUM_FILE_CHARACTERS =
  120_000;

const MAXIMUM_PROPOSED_CONTENT_CHARACTERS =
  300_000;

const MAXIMUM_MODEL_OUTPUT_TOKENS =
  16_000;

const ALLOWED_CHANGE_TYPES =
  new Set<RoyalOSDeveloperChangeType>([
    "create",
    "replace",
    "modify",
  ]);

const ALLOWED_RISK_LEVELS =
  new Set<RoyalOSDeveloperRiskLevel>([
    "low",
    "medium",
    "high",
    "critical",
  ]);

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
    );
}

function uniqueStrings(
  values: Array<
    string | null | undefined
  >
): string[] {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value?.trim() || ""
        )
        .filter(Boolean)
    )
  );
}

function createSha256(
  content: string
): string {
  return createHash(
    "sha256"
  )
    .update(
      content,
      "utf8"
    )
    .digest(
      "hex"
    );
}

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unknown Orion proposal error.";
}

/*
 * ============================================================
 * JSON EXTRACTION
 * ============================================================
 */

function removeMarkdownCodeFence(
  value: string
): string {
  const cleaned =
    value.trim();

  if (
    !cleaned.startsWith(
      "```"
    )
  ) {
    return cleaned;
  }

  return cleaned
    .replace(
      /^```(?:json)?\s*/i,
      ""
    )
    .replace(
      /\s*```$/,
      ""
    )
    .trim();
}

function extractJsonObject(
  value: string
): string {
  const cleaned =
    removeMarkdownCodeFence(
      value
    );

  const firstBrace =
    cleaned.indexOf(
      "{"
    );

  const finalBrace =
    cleaned.lastIndexOf(
      "}"
    );

  if (
    firstBrace < 0 ||
    finalBrace <=
      firstBrace
  ) {
    throw new Error(
      "Orion did not return a valid proposal object."
    );
  }

  return cleaned.slice(
    firstBrace,
    finalBrace + 1
  );
}

function parseModelPayload(
  outputText: string
): ModelProposalPayload {
  const jsonText =
    extractJsonObject(
      outputText
    );

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        jsonText
      );
  } catch (error) {
    throw new Error(
      `Orion returned invalid proposal JSON: ${getErrorMessage(
        error
      )}`
    );
  }

  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "Orion returned an invalid proposal structure."
    );
  }

  return parsed as
    ModelProposalPayload;
}

/*
 * ============================================================
 * MODEL VALUE NORMALIZATION
 * ============================================================
 */

function normalizeChangeType(
  value: unknown
): RoyalOSDeveloperChangeType {
  if (
    typeof value ===
      "string" &&
    ALLOWED_CHANGE_TYPES.has(
      value as
        RoyalOSDeveloperChangeType
    )
  ) {
    return value as
      RoyalOSDeveloperChangeType;
  }

  return "modify";
}

function normalizeRiskLevel(
  value: unknown,
  fallback:
    RoyalOSDeveloperRiskLevel
): RoyalOSDeveloperRiskLevel {
  if (
    typeof value ===
      "string" &&
    ALLOWED_RISK_LEVELS.has(
      value as
        RoyalOSDeveloperRiskLevel
    )
  ) {
    return value as
      RoyalOSDeveloperRiskLevel;
  }

  return fallback;
}

function normalizeStringArray(
  value: unknown,
  maximumItems = 20,
  maximumItemLength = 500
): string[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return uniqueStrings(
    value.map(
      (item) =>
        typeof item ===
        "string"
          ? item.slice(
              0,
              maximumItemLength
            )
          : undefined
    )
  ).slice(
    0,
    maximumItems
  );
}

/*
 * ============================================================
 * PROMPT BUILDING
 * ============================================================
 */

function createProjectContext(
  files:
    RoyalOSDeveloperFileContent[]
): string {
  return files
    .map(
      (
        file,
        index
      ) => {
        const content =
          file.content.slice(
            0,
            MAXIMUM_FILE_CHARACTERS
          );

        return [
          `FILE ${index + 1}: ${file.file.relativePath}`,
          `LANGUAGE: ${file.file.language}`,
          `CATEGORY: ${file.file.category}`,
          `SHA256: ${file.sha256 ?? "not-calculated"}`,
          "CONTENT:",
          content,
        ].join(
          "\n"
        );
      }
    )
    .join(
      "\n\n============================================================\n\n"
    );
}

function createProposalPrompt(
  values: {
    instruction: string;

    plan:
      RoyalOSDeveloperPlan;

    files:
      RoyalOSDeveloperFileContent[];
  }
): string {
  const projectContext =
    createProjectContext(
      values.files
    );

  return `
You are Orion, the senior software engineer inside RoyalOS.

Ayobami's development request:

${values.instruction}

Approved development plan:

Title: ${values.plan.title}
Objective: ${values.plan.objective}
Risk level: ${values.plan.riskLevel}
Affected paths:
${values.plan.affectedPaths
  .map(
    (pathValue) =>
      `- ${pathValue}`
  )
  .join("\n")}

Approved source files:

${projectContext}

Prepare a code proposal only.

SECURITY AND BEHAVIOR RULES:

1. Do not claim that files were changed.
2. Do not run commands.
3. Do not request or expose environment variables, API keys, passwords, private keys, or tokens.
4. Do not propose changes outside the approved RoyalOS project paths.
5. Do not delete or rename files.
6. Do not modify package-lock files, node_modules, .next, .git, uploaded assets, or secret files.
7. Preserve existing working behavior unless the request specifically requires changing it.
8. Prefer the smallest safe set of changes.
9. Every proposed file must include its complete final content.
10. Do not use placeholders such as:
   - "existing code here"
   - "rest of file unchanged"
   - "implement later"
   - ellipsis standing in for required code
11. Code must be valid TypeScript, TSX, JavaScript, CSS, JSON, SQL, or the language already used by the target file.
12. Do not include Markdown outside the required JSON object.
13. Do not wrap the JSON in a code fence.
14. The proposal is for CEO review only and will not be applied automatically.

Return exactly one JSON object using this shape:

{
  "summary": "A concise explanation of the proposal.",
  "changes": [
    {
      "relativePath": "app/example.ts",
      "changeType": "modify",
      "summary": "What changes in this file.",
      "reason": "Why this file must change.",
      "proposedContent": "The complete final file content.",
      "riskLevel": "low",
      "validationCommands": [
        "npx tsc --noEmit"
      ],
      "rollbackInstructions": [
        "Restore the original file from backup."
      ]
    }
  ]
}

Allowed changeType values:

- create
- replace
- modify

Allowed riskLevel values:

- low
- medium
- high
- critical

Return valid JSON only.
`.trim();
}

/*
 * ============================================================
 * FILE LOOKUP
 * ============================================================
 */

function findOriginalFile(
  files:
    RoyalOSDeveloperFileContent[],
  relativePath: string
): RoyalOSDeveloperFileContent | undefined {
  const normalizedPath =
    normalizePath(
      relativePath
    ).toLowerCase();

  return files.find(
    (file) =>
      normalizePath(
        file.file.relativePath
      ).toLowerCase() ===
      normalizedPath
  );
}

/*
 * ============================================================
 * PATH VALIDATION
 * ============================================================
 */

async function validateProposedPath(
  relativePath: string,
  plan:
    RoyalOSDeveloperPlan
): Promise<void> {
  const normalizedPath =
    normalizePath(
      relativePath
    );

  const pathIsGrounded =
    plan.affectedPaths.some(
      (affectedPath) => {
        const normalizedAffectedPath =
          normalizePath(
            affectedPath
          );

        return (
          normalizedPath ===
            normalizedAffectedPath ||
          normalizedPath.startsWith(
            `${normalizedAffectedPath}/`
          ) ||
          normalizedAffectedPath.startsWith(
            `${normalizedPath}/`
          )
        );
      }
    );

  if (
    !pathIsGrounded
  ) {
    throw new Error(
      `Orion proposed "${normalizedPath}", but that path is outside the approved development-plan scope.`
    );
  }

  const decision =
    await evaluateRoyalOSDeveloperPathSecurely(
      normalizedPath,
      {
        accessLevel:
          "propose",

        isDirectory:
          false,
      }
    );

  if (
    !decision.allowed
  ) {
    throw new Error(
      `Orion cannot propose changes for "${normalizedPath}": ${decision.reason}`
    );
  }
}

/*
 * ============================================================
 * CHANGE NORMALIZATION
 * ============================================================
 */

async function normalizeModelChanges(
  values: {
    payload:
      ModelProposalPayload;

    plan:
      RoyalOSDeveloperPlan;

    analyzedFiles:
      RoyalOSDeveloperFileContent[];
  }
): Promise<
  RoyalOSDeveloperProposedChange[]
> {
  if (
    !Array.isArray(
      values.payload.changes
    )
  ) {
    throw new Error(
      "Orion returned no proposed file changes."
    );
  }

  const rawChanges =
    values.payload
      .changes as
      ModelProposedChange[];

  if (
    rawChanges.length ===
      0
  ) {
    throw new Error(
      "Orion returned an empty code proposal."
    );
  }

  if (
    rawChanges.length >
    MAXIMUM_FILES_FOR_PROPOSAL
  ) {
    throw new Error(
      `Orion proposed ${rawChanges.length} files, exceeding the ${MAXIMUM_FILES_FOR_PROPOSAL}-file proposal limit.`
    );
  }

  const normalizedChanges:
    RoyalOSDeveloperProposedChange[] = [];

  const usedPaths =
    new Set<string>();

  for (
    const rawChange of
    rawChanges
  ) {
    if (
      !rawChange ||
      typeof rawChange !==
        "object"
    ) {
      continue;
    }

    const relativePath =
      normalizePath(
        cleanRequiredText(
          rawChange.relativePath,
          "Proposed file path",
          500
        )
      );

    const pathKey =
      relativePath.toLowerCase();

    if (
      usedPaths.has(
        pathKey
      )
    ) {
      throw new Error(
        `Orion proposed duplicate changes for "${relativePath}".`
      );
    }

    usedPaths.add(
      pathKey
    );

    await validateProposedPath(
      relativePath,
      values.plan
    );

    const proposedContent =
      cleanRequiredText(
        rawChange.proposedContent,
        `Proposed content for ${relativePath}`,
        MAXIMUM_PROPOSED_CONTENT_CHARACTERS
      );

    const originalFile =
      findOriginalFile(
        values.analyzedFiles,
        relativePath
      );

    const changeType =
      originalFile
        ? normalizeChangeType(
            rawChange.changeType
          ) === "create"
          ? "modify"
          : normalizeChangeType(
              rawChange.changeType
            )
        : "create";

    const riskLevel =
      normalizeRiskLevel(
        rawChange.riskLevel,
        values.plan
          .riskLevel
      );

    const validationCommands =
      normalizeStringArray(
        rawChange.validationCommands,
        10,
        300
      );

    const rollbackInstructions =
      normalizeStringArray(
        rawChange.rollbackInstructions,
        10,
        500
      );

    normalizedChanges.push({
      changeId:
        createIdentifier(
          "developer_change"
        ),

      planId:
        values.plan
          .planId,

      relativePath,

      changeType,

      riskLevel,

      requiresCEOApproval:
        true,

      summary:
        cleanOptionalText(
          rawChange.summary,
          1_000
        ) ||
        `Proposed ${changeType} for ${relativePath}.`,

      reason:
        cleanOptionalText(
          rawChange.reason,
          2_000
        ) ||
        "This change supports the approved RoyalOS development objective.",

      originalContent:
        originalFile
          ?.content,

      proposedContent,

      originalSha256:
        originalFile
          ?.sha256 ??
        (
          originalFile
            ? createSha256(
                originalFile.content
              )
            : undefined
        ),

      backupRequired:
        Boolean(
          originalFile
        ),

      validationCommands:
        validationCommands.length >
        0
          ? validationCommands
          : values.plan
              .validationCommands,

      rollbackInstructions:
        rollbackInstructions.length >
        0
          ? rollbackInstructions
          : originalFile
            ? [
                `Restore "${relativePath}" from its verified backup.`,
              ]
            : [
                `Remove the newly created "${relativePath}" file if the approved implementation is rolled back.`,
              ],
    });
  }

  if (
    normalizedChanges.length ===
      0
  ) {
    throw new Error(
      "Orion did not return any valid proposed changes."
    );
  }

  return normalizedChanges;
}

/*
 * ============================================================
 * MAIN PROPOSAL CREATOR
 * ============================================================
 */

export async function createRoyalOSDeveloperProposal(
  request:
    CreateRoyalOSDeveloperProposalRequest
): Promise<RoyalOSDeveloperProposalResult> {
  const startedAt =
    globalThis.performance.now();

  const policy =
    getRoyalOSDeveloperSecurityPolicy();

  if (
    !policy.readOnly ||
    policy.allowWrites
  ) {
    throw new Error(
      "The proposal engine requires the Developer Workbench to remain read-only."
    );
  }

  const instruction =
    cleanRequiredText(
      request.instruction,
      "Development instruction",
      MAXIMUM_INSTRUCTION_LENGTH
    );

  const requestId =
    cleanOptionalText(
      request.requestId,
      200
    ) ||
    createIdentifier(
      "developer_request"
    );

  const employee =
    request.employee ??
    "Orion";

  const planningRequest:
    CreateRoyalOSDeveloperPlanRequest = {
      requestId,

      instruction,

      employee,

      workspace:
        request.workspace,

      paths:
        request.paths,

      searchQueries:
        request.searchQueries,

      includeContents:
        false,

      maximumFiles:
        request.maximumFiles,

      metadata:
        request.metadata,
    };

  const planningResult =
    await createRoyalOSDeveloperPlan(
      planningRequest
    );

  const plan =
    planningResult.plan;

  if (
    !plan.requiresCEOApproval
  ) {
    throw new Error(
      "This request was classified as read-only. Ask Orion for a code change, feature, fix, or implementation before generating a proposal."
    );
  }

  const sourcePaths =
    uniqueStrings([
      ...(request.paths ||
        []),

      ...plan.affectedPaths,
    ])
      .map(
        normalizePath
      )
      .slice(
        0,
        MAXIMUM_FILES_FOR_PROPOSAL
      );

  if (
    sourcePaths.length ===
      0
  ) {
    throw new Error(
      "Orion could not identify any approved source files for this proposal. Supply the relevant project paths."
    );
  }

  const readResult =
    await readRoyalOSDeveloperFiles(
      sourcePaths,
      {
        maximumFiles:
          MAXIMUM_FILES_FOR_PROPOSAL,

        maximumCharacters:
          MAXIMUM_FILE_CHARACTERS,

        includeSha256:
          true,
      }
    );

  const analyzedFiles =
    readResult.contents;

  if (
    analyzedFiles.length ===
      0
  ) {
    throw new Error(
      "Orion could not read any approved source files for the proposal."
    );
  }

  const apiKey =
    process.env
      .OPENAI_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured for Orion."
    );
  }

  const model =
    process.env
      .OPENAI_DEVELOPER_MODEL
      ?.trim() ||
    process.env
      .OPENAI_MODEL
      ?.trim() ||
    "gpt-5.6";

  const openai =
    new OpenAI({
      apiKey,
    });

  const response =
    await openai.responses.create({
      model,

      instructions:
        "You are Orion, RoyalOS's senior software engineer. Return valid JSON only. You may propose code, but you may never claim to have changed files.",

      input:
        createProposalPrompt({
          instruction,

          plan,

          files:
            analyzedFiles,
        }),

      max_output_tokens:
        MAXIMUM_MODEL_OUTPUT_TOKENS,

      store:
        false,
    });

  const outputText =
    response.output_text
      ?.trim();

  if (!outputText) {
    throw new Error(
      "Orion returned an empty code proposal."
    );
  }

  const payload =
    parseModelPayload(
      outputText
    );

  const changes =
    await normalizeModelChanges({
      payload,

      plan,

      analyzedFiles,
    });

  const durationMs =
    Math.round(
      globalThis.performance.now() -
        startedAt
    );

  return {
    requestId,

    proposalId:
      createIdentifier(
        "developer_proposal"
      ),

    plan: {
      ...plan,

      status:
        "awaiting_approval",
    },

    changes,

    analyzedFiles,

    blockedPaths:
      readResult.blockedPaths,

    warnings:
      uniqueStrings([
        ...planningResult.warnings,

        ...readResult.warnings,

        "This is a code proposal only. No project files were changed.",

        "Every proposed change requires CEO approval before a later apply stage.",

        changes.some(
          (change) =>
            change.riskLevel ===
              "high" ||
            change.riskLevel ===
              "critical"
        )
          ? "At least one proposed change has elevated risk and requires careful review."
          : undefined,
      ]),

    model,

    createdAt:
      new Date()
        .toISOString(),

    durationMs,
  };
}