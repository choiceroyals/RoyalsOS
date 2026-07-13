import "server-only";

import {
  inspectRoyalOSDeveloperProject,
} from "@/lib/developer/project-reader";

import {
  searchRoyalOSDeveloperCode,
} from "@/lib/developer/code-search";

import {
  getRoyalOSDeveloperSecurityPolicy,
} from "@/lib/developer/security";

import type {
  RoyalOSDeveloperEmployee,
  RoyalOSDeveloperInspectionResult,
  RoyalOSDeveloperPlan,
  RoyalOSDeveloperPlanStep,
  RoyalOSDeveloperRequestStatus,
  RoyalOSDeveloperRiskLevel,
  RoyalOSDeveloperSearchResult,
} from "@/lib/developer/types";

import type {
  RoyalOSJsonObject,
  RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * PUBLIC REQUEST AND RESULT TYPES
 * ============================================================
 */

export type CreateRoyalOSDeveloperPlanRequest = {
  requestId?: string;

  instruction: string;

  employee?: RoyalOSDeveloperEmployee;

  workspace: RoyalOSWorkspace;

  paths?: string[];

  searchQueries?: string[];

  includeContents?: boolean;

  maximumFiles?: number;

  metadata?: RoyalOSJsonObject;
};

export type RoyalOSDeveloperPlanningResult = {
  plan: RoyalOSDeveloperPlan;

  inspection:
    RoyalOSDeveloperInspectionResult;

  searches:
    RoyalOSDeveloperSearchResult[];

  groundedPaths: string[];

  warnings: string[];
};

/*
 * ============================================================
 * INTERNAL TYPES
 * ============================================================
 */

type DeveloperIntent =
  | "inspect"
  | "explain"
  | "debug"
  | "create"
  | "modify"
  | "refactor"
  | "delete"
  | "database"
  | "integration"
  | "deployment"
  | "unknown";

type PlanAnalysis = {
  intent: DeveloperIntent;

  readOnly: boolean;

  requiresCodeChanges: boolean;

  requiresDatabaseChanges: boolean;

  requiresPackageChanges: boolean;

  requiresDeployment: boolean;

  affectsAuthentication: boolean;

  affectsPayments: boolean;

  affectsSecrets: boolean;

  affectsUserData: boolean;

  likelyFrontend: boolean;

  likelyBackend: boolean;

  likelyDatabase: boolean;

  likelyInfrastructure: boolean;
};

/*
 * ============================================================
 * LIMITS
 * ============================================================
 */

const MAXIMUM_INSTRUCTION_LENGTH =
  20_000;

const MAXIMUM_SEARCH_QUERIES =
  8;

const MAXIMUM_GROUNDED_PATHS =
  30;

const MAXIMUM_AFFECTED_PATHS =
  20;

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
  const cleaned =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required for the Orion Developer Workbench.`
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
  value: unknown
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    undefined;
}

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

function titleFromInstruction(
  instruction: string
): string {
  const firstLine =
    instruction
      .split(
        /\r\n|\r|\n/
      )[0]
      ?.trim() ||
    "RoyalOS Development Plan";

  const cleaned =
    firstLine
      .replace(
        /\s+/g,
        " "
      )
      .replace(
        /[.!?]+$/g,
        ""
      )
      .slice(
        0,
        120
      );

  return cleaned ||
    "RoyalOS Development Plan";
}

function sentenceFromInstruction(
  instruction: string
): string {
  const cleaned =
    instruction
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    cleaned.length <=
    500
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    497
  )}...`;
}

/*
 * ============================================================
 * INSTRUCTION ANALYSIS
 * ============================================================
 */

function includesAny(
  text: string,
  phrases: string[]
): boolean {
  return phrases.some(
    (phrase) =>
      text.includes(
        phrase
      )
  );
}

function analyzeDeveloperInstruction(
  instruction: string
): PlanAnalysis {
  const normalized =
    instruction.toLowerCase();

  const deleteIntent =
    includesAny(
      normalized,
      [
        "delete ",
        "remove file",
        "drop table",
        "drop column",
        "destroy",
        "erase",
        "purge",
      ]
    );

  const databaseIntent =
    includesAny(
      normalized,
      [
        "database",
        "supabase",
        "sql",
        "table",
        "migration",
        "schema",
        "row level security",
        "rls",
        "storage bucket",
      ]
    );

  const deploymentIntent =
    includesAny(
      normalized,
      [
        "deploy",
        "deployment",
        "production",
        "publish app",
        "vercel",
        "release",
      ]
    );

  const packageIntent =
    includesAny(
      normalized,
      [
        "install package",
        "npm install",
        "add dependency",
        "upgrade package",
        "package.json",
        "dependency",
      ]
    );

  const authenticationIntent =
    includesAny(
      normalized,
      [
        "authentication",
        "authorization",
        "login",
        "sign in",
        "sign-in",
        "password",
        "oauth",
        "session",
        "jwt",
        "permission",
        "access control",
      ]
    );

  const paymentIntent =
    includesAny(
      normalized,
      [
        "payment",
        "stripe",
        "paypal",
        "checkout",
        "billing",
        "subscription",
        "credit card",
      ]
    );

  const secretIntent =
    includesAny(
      normalized,
      [
        ".env",
        "api key",
        "secret key",
        "service role",
        "password",
        "private key",
        "access token",
      ]
    );

  const userDataIntent =
    includesAny(
      normalized,
      [
        "user data",
        "customer data",
        "personal data",
        "messages",
        "chat history",
        "memory",
        "uploaded files",
      ]
    );

  const frontendIntent =
    includesAny(
      normalized,
      [
        "page",
        "dashboard",
        "component",
        "button",
        "form",
        "interface",
        "ui",
        "css",
        "layout",
        "responsive",
        "sidebar",
        "modal",
      ]
    );

  const backendIntent =
    includesAny(
      normalized,
      [
        "api",
        "route",
        "server",
        "endpoint",
        "webhook",
        "service",
        "connector",
        "executor",
        "middleware",
      ]
    );

  const integrationIntent =
    includesAny(
      normalized,
      [
        "connect",
        "integration",
        "integrate",
        "api",
        "webhook",
        "wordpress",
        "openai",
        "supabase",
        "facebook",
        "instagram",
        "youtube",
        "tiktok",
      ]
    );

  const refactorIntent =
    includesAny(
      normalized,
      [
        "refactor",
        "restructure",
        "clean up",
        "simplify",
        "optimize code",
        "reorganize",
      ]
    );

  const debugIntent =
    includesAny(
      normalized,
      [
        "fix",
        "error",
        "bug",
        "broken",
        "not working",
        "failed",
        "debug",
        "typescript error",
        "build error",
      ]
    );

  const createIntent =
    includesAny(
      normalized,
      [
        "create",
        "build",
        "add",
        "implement",
        "develop",
        "generate code",
        "make a",
        "new feature",
      ]
    );

  const modifyIntent =
    includesAny(
      normalized,
      [
        "update",
        "change",
        "modify",
        "replace",
        "edit",
        "improve",
        "expand",
      ]
    );

  const inspectionIntent =
    includesAny(
      normalized,
      [
        "inspect",
        "read",
        "show me",
        "find",
        "search",
        "explain",
        "understand",
        "review",
        "analyze",
        "audit",
      ]
    );

  const explicitChangeIntent =
    deleteIntent ||
    databaseIntent ||
    deploymentIntent ||
    packageIntent ||
    refactorIntent ||
    debugIntent ||
    createIntent ||
    modifyIntent;

  let intent:
    DeveloperIntent =
      "unknown";

  if (deleteIntent) {
    intent =
      "delete";
  } else if (
    deploymentIntent
  ) {
    intent =
      "deployment";
  } else if (
    databaseIntent
  ) {
    intent =
      "database";
  } else if (
    integrationIntent
  ) {
    intent =
      "integration";
  } else if (
    refactorIntent
  ) {
    intent =
      "refactor";
  } else if (
    debugIntent
  ) {
    intent =
      "debug";
  } else if (
    createIntent
  ) {
    intent =
      "create";
  } else if (
    modifyIntent
  ) {
    intent =
      "modify";
  } else if (
    inspectionIntent
  ) {
    intent =
      includesAny(
        normalized,
        [
          "explain",
          "understand",
          "how does",
        ]
      )
        ? "explain"
        : "inspect";
  }

  return {
    intent,

    readOnly:
      inspectionIntent &&
      !explicitChangeIntent,

    requiresCodeChanges:
      explicitChangeIntent,

    requiresDatabaseChanges:
      databaseIntent,

    requiresPackageChanges:
      packageIntent,

    requiresDeployment:
      deploymentIntent,

    affectsAuthentication:
      authenticationIntent,

    affectsPayments:
      paymentIntent,

    affectsSecrets:
      secretIntent,

    affectsUserData:
      userDataIntent,

    likelyFrontend:
      frontendIntent,

    likelyBackend:
      backendIntent,

    likelyDatabase:
      databaseIntent,

    likelyInfrastructure:
      deploymentIntent ||
      packageIntent,
  };
}

/*
 * ============================================================
 * PATH EXTRACTION
 * ============================================================
 */

function extractPathsFromInstruction(
  instruction: string
): string[] {
  const matches =
    instruction.match(
      /(?:^|[\s"'`(])((?:app|lib|components|public|styles|scripts|types|database|supabase)\/[A-Za-z0-9_./@()[\]-]+\.[A-Za-z0-9]+)(?=$|[\s"'`,;:)])/g
    ) || [];

  return uniqueStrings(
    matches.map(
      (match) =>
        normalizePath(
          match
            .trim()
            .replace(
              /^[("'`]+/,
              ""
            )
            .replace(
              /[)"'`,;:]+$/,
              ""
            )
        )
    )
  );
}

function collectGroundedPaths(
  values: {
    requestedPaths:
      string[];

    extractedPaths:
      string[];

    inspection:
      RoyalOSDeveloperInspectionResult;

    searches:
      RoyalOSDeveloperSearchResult[];
  }
): string[] {
  const searchPaths =
    values.searches.flatMap(
      (search) =>
        search.matches.map(
          (match) =>
            match.relativePath
        )
    );

  const inspectionPaths =
    values.inspection.files.map(
      (file) =>
        file.relativePath
    );

  return uniqueStrings([
    ...values.requestedPaths,
    ...values.extractedPaths,
    ...searchPaths,
    ...inspectionPaths,
  ])
    .map(
      normalizePath
    )
    .slice(
      0,
      MAXIMUM_GROUNDED_PATHS
    );
}

/*
 * ============================================================
 * RISK ANALYSIS
 * ============================================================
 */

function calculateRiskLevel(
  analysis:
    PlanAnalysis,
  affectedPaths:
    string[]
): RoyalOSDeveloperRiskLevel {
  if (
    analysis.affectsSecrets ||
    (
      analysis.intent ===
        "delete" &&
      analysis.requiresDatabaseChanges
    )
  ) {
    return "critical";
  }

  if (
    analysis.requiresDeployment ||
    analysis.affectsPayments ||
    analysis.affectsAuthentication ||
    analysis.requiresDatabaseChanges ||
    analysis.intent ===
      "delete"
  ) {
    return "high";
  }

  if (
    analysis.requiresPackageChanges ||
    analysis.intent ===
      "integration" ||
    analysis.likelyBackend ||
    affectedPaths.length >
      5
  ) {
    return "medium";
  }

  return "low";
}

function getRiskReasons(
  analysis:
    PlanAnalysis,
  riskLevel:
    RoyalOSDeveloperRiskLevel,
  affectedPaths:
    string[]
): string[] {
  const reasons:
    string[] = [];

  if (
    analysis.affectsSecrets
  ) {
    reasons.push(
      "The instruction references credentials, secrets, tokens, or protected environment configuration."
    );
  }

  if (
    analysis.affectsAuthentication
  ) {
    reasons.push(
      "Authentication or access-control behavior may be affected."
    );
  }

  if (
    analysis.affectsPayments
  ) {
    reasons.push(
      "Payment or billing behavior may be affected."
    );
  }

  if (
    analysis.requiresDatabaseChanges
  ) {
    reasons.push(
      "Database structure, permissions, storage, or persistent records may be affected."
    );
  }

  if (
    analysis.requiresDeployment
  ) {
    reasons.push(
      "The instruction may affect deployment or production behavior."
    );
  }

  if (
    analysis.requiresPackageChanges
  ) {
    reasons.push(
      "Package or dependency changes may alter the application build."
    );
  }

  if (
    analysis.intent ===
      "delete"
  ) {
    reasons.push(
      "Deletion was requested and requires separate CEO approval."
    );
  }

  if (
    affectedPaths.length >
      5
  ) {
    reasons.push(
      `The plan may affect ${affectedPaths.length} project paths.`
    );
  }

  if (
    reasons.length ===
    0
  ) {
    reasons.push(
      riskLevel ===
        "low"
        ? "The work is limited to read-only inspection or a narrowly scoped source-code change."
        : "The work requires controlled implementation and validation."
    );
  }

  return reasons;
}

/*
 * ============================================================
 * EMPLOYEE ROUTING
 * ============================================================
 */

function selectSupportingEmployees(
  analysis:
    PlanAnalysis,
  instruction: string
): RoyalOSDeveloperEmployee[] {
  const normalized =
    instruction.toLowerCase();

  const employees =
    new Set<RoyalOSDeveloperEmployee>();

  if (
    analysis.likelyFrontend ||
    includesAny(
      normalized,
      [
        "design",
        "visual",
        "image",
        "layout",
        "style",
        "responsive",
      ]
    )
  ) {
    employees.add(
      "Nova"
    );
  }

  if (
    analysis.intent ===
      "integration" ||
    analysis.requiresPackageChanges ||
    includesAny(
      normalized,
      [
        "documentation",
        "official docs",
        "research",
        "compare",
      ]
    )
  ) {
    employees.add(
      "Atlas"
    );
  }

  if (
    analysis.likelyInfrastructure ||
    analysis.likelyDatabase ||
    includesAny(
      normalized,
      [
        "workflow",
        "automation",
        "operations",
        "pipeline",
      ]
    )
  ) {
    employees.add(
      "Titan"
    );
  }

  if (
    analysis.requiresDeployment ||
    analysis.requiresDatabaseChanges ||
    analysis.affectsAuthentication ||
    analysis.affectsPayments
  ) {
    employees.add(
      "Adedeji"
    );
  }

  return Array.from(
    employees
  );
}

/*
 * ============================================================
 * VALIDATION COMMANDS
 * ============================================================
 */

function getPackageCommandPrefix(
  packageManager:
    | "npm"
    | "pnpm"
    | "yarn"
    | "bun"
    | "unknown"
    | undefined
): string {
  if (
    packageManager ===
    "pnpm"
  ) {
    return "pnpm";
  }

  if (
    packageManager ===
    "yarn"
  ) {
    return "yarn";
  }

  if (
    packageManager ===
    "bun"
  ) {
    return "bun";
  }

  return "npm";
}

function buildValidationCommands(
  values: {
    packageManager:
      | "npm"
      | "pnpm"
      | "yarn"
      | "bun"
      | "unknown"
      | undefined;

    analysis:
      PlanAnalysis;

    affectedPaths:
      string[];
  }
): string[] {
  if (
    values.analysis.readOnly
  ) {
    return [];
  }

  const packageCommand =
    getPackageCommandPrefix(
      values.packageManager
    );

  const commands = [
    "npx tsc --noEmit",
  ];

  if (
    values.analysis.likelyBackend ||
    values.analysis.requiresPackageChanges ||
    values.analysis.requiresDatabaseChanges ||
    values.affectedPaths.length >
      3
  ) {
    commands.push(
      packageCommand ===
        "npm"
        ? "npm run build"
        : `${packageCommand} build`
    );
  }

  return uniqueStrings(
    commands
  );
}

/*
 * ============================================================
 * PLAN STEPS
 * ============================================================
 */

function createPlanSteps(
  values: {
    analysis:
      PlanAnalysis;

    affectedPaths:
      string[];

    riskLevel:
      RoyalOSDeveloperRiskLevel;

    validationCommands:
      string[];

    supportingEmployees:
      RoyalOSDeveloperEmployee[];
  }
): RoyalOSDeveloperPlanStep[] {
  const steps:
    RoyalOSDeveloperPlanStep[] = [];

  steps.push({
    stepNumber:
      1,

    title:
      "Inspect the approved project scope",

    description:
      "Orion reads only the approved RoyalOS source files, confirms the current implementation, and identifies the exact code involved.",

    employee:
      "Orion",

    affectedPaths:
      values.affectedPaths,

    riskLevel:
      "low",

    requiresCEOApproval:
      false,

    validationCommands:
      [],

    rollbackInstructions:
      "No rollback is required because this step is read-only.",
  });

  if (
    values.supportingEmployees.includes(
      "Atlas"
    )
  ) {
    steps.push({
      stepNumber:
        steps.length + 1,

      title:
        "Research technical requirements",

      description:
        "Atlas verifies the relevant architecture, integration requirements, and technical constraints before Orion proposes code.",

      employee:
        "Atlas",

      affectedPaths:
        values.affectedPaths,

      riskLevel:
        "low",

      requiresCEOApproval:
        false,

      validationCommands:
        [],

      rollbackInstructions:
        "No rollback is required because this step performs research only.",

      dependencies: [
        1,
      ],
    });
  }

  if (
    values.supportingEmployees.includes(
      "Nova"
    )
  ) {
    steps.push({
      stepNumber:
        steps.length + 1,

      title:
        "Prepare the interface direction",

      description:
        "Nova defines the visual behavior, layout requirements, and user experience that Orion should preserve or implement.",

      employee:
        "Nova",

      affectedPaths:
        values.affectedPaths,

      riskLevel:
        "low",

      requiresCEOApproval:
        false,

      validationCommands:
        [],

      rollbackInstructions:
        "No rollback is required because no project files are changed in this step.",

      dependencies: [
        1,
      ],
    });
  }

  if (
    values.supportingEmployees.includes(
      "Titan"
    )
  ) {
    steps.push({
      stepNumber:
        steps.length + 1,

      title:
        "Review operational impact",

      description:
        "Titan reviews the workflow, data movement, automation, and operational effects of the proposed development work.",

      employee:
        "Titan",

      affectedPaths:
        values.affectedPaths,

      riskLevel:
        values.riskLevel ===
          "critical"
          ? "high"
          : values.riskLevel,

      requiresCEOApproval:
        false,

      validationCommands:
        [],

      rollbackInstructions:
        "No rollback is required because this review does not alter the application.",

      dependencies: [
        1,
      ],
    });
  }

  if (
    values.analysis.readOnly
  ) {
    steps.push({
      stepNumber:
        steps.length + 1,

      title:
        "Deliver the grounded explanation",

      description:
        "Orion reports what the approved files currently do, cites the relevant project paths, and identifies any uncertainty without modifying the project.",

      employee:
        "Orion",

      affectedPaths:
        values.affectedPaths,

      riskLevel:
        "low",

      requiresCEOApproval:
        false,

      validationCommands:
        [],

      rollbackInstructions:
        "No rollback is required because the complete request is read-only.",

      dependencies: [
        1,
      ],
    });

    return steps;
  }

  const proposalStepNumber =
    steps.length + 1;

  steps.push({
    stepNumber:
      proposalStepNumber,

    title:
      "Prepare proposed code changes",

    description:
      "Orion prepares the exact file changes and code differences. Nothing is written to disk during this proposal stage.",

    employee:
      "Orion",

    affectedPaths:
      values.affectedPaths,

    riskLevel:
      values.riskLevel,

    requiresCEOApproval:
      false,

    validationCommands:
      values.validationCommands,

    rollbackInstructions:
      "Discard the proposal without changing any project files.",

    dependencies: [
      1,
    ],
  });

  const approvalStepNumber =
    steps.length + 1;

  steps.push({
    stepNumber:
      approvalStepNumber,

    title:
      "Request CEO approval",

    description:
      "RoyalOS shows Ayobami the affected files, proposed differences, risks, validation commands, and rollback plan before any change is applied.",

    employee:
      values.supportingEmployees.includes(
        "Adedeji"
      )
        ? "Adedeji"
        : "Orion",

    affectedPaths:
      values.affectedPaths,

    riskLevel:
      values.riskLevel,

    requiresCEOApproval:
      true,

    validationCommands:
      [],

    rollbackInstructions:
      "Rejecting the proposal leaves the project unchanged.",

    dependencies: [
      proposalStepNumber,
    ],
  });

  const backupStepNumber =
    steps.length + 1;

  steps.push({
    stepNumber:
      backupStepNumber,

    title:
      "Create protected backups",

    description:
      "After approval, RoyalOS creates a versioned backup of every existing file that will be modified or replaced.",

    employee:
      "Orion",

    affectedPaths:
      values.affectedPaths,

    riskLevel:
      values.riskLevel,

    requiresCEOApproval:
      true,

    validationCommands:
      [],

    rollbackInstructions:
      "Restore every affected file from its verified pre-change backup.",

    dependencies: [
      approvalStepNumber,
    ],
  });

  const applyStepNumber =
    steps.length + 1;

  steps.push({
    stepNumber:
      applyStepNumber,

    title:
      "Apply only the approved changes",

    description:
      "Orion applies only the code differences approved by Ayobami and refuses unrelated file changes.",

    employee:
      "Orion",

    affectedPaths:
      values.affectedPaths,

    riskLevel:
      values.riskLevel,

    requiresCEOApproval:
      true,

    validationCommands:
      values.validationCommands,

    rollbackInstructions:
      "Restore the protected backups if any approved change cannot be applied safely.",

    dependencies: [
      backupStepNumber,
    ],
  });

  steps.push({
    stepNumber:
      steps.length + 1,

    title:
      "Validate and report",

    description:
      "RoyalOS runs only the approved validation commands, records the output, and rolls back automatically when validation fails.",

    employee:
      "Orion",

    affectedPaths:
      values.affectedPaths,

    riskLevel:
      values.riskLevel,

    requiresCEOApproval:
      false,

    validationCommands:
      values.validationCommands,

    rollbackInstructions:
      "Restore all affected files from backup and preserve the validation failure report for correction.",

    dependencies: [
      applyStepNumber,
    ],
  });

  return steps;
}

/*
 * ============================================================
 * SEARCH EXECUTION
 * ============================================================
 */

async function runPlanningSearches(
  values: {
    requestId: string;

    employee:
      RoyalOSDeveloperEmployee;

    workspace:
      RoyalOSWorkspace;

    paths:
      string[];

    queries:
      string[];
  }
): Promise<{
  searches:
    RoyalOSDeveloperSearchResult[];

  warnings:
    string[];
}> {
  const searches:
    RoyalOSDeveloperSearchResult[] = [];

  const warnings:
    string[] = [];

  const queries =
    uniqueStrings(
      values.queries
    ).slice(
      0,
      MAXIMUM_SEARCH_QUERIES
    );

  for (
    const query of
    queries
  ) {
    try {
      const result =
        await searchRoyalOSDeveloperCode({
          requestId:
            `${values.requestId}_${searches.length + 1}`,

          query,

          employee:
            values.employee,

          workspace:
            values.workspace,

          paths:
            values.paths.length >
              0
              ? values.paths
              : undefined,

          caseSensitive:
            false,

          useRegularExpression:
            false,

          maximumResults:
            50,

          contextLines:
            2,
        });

      searches.push(
        result
      );
    } catch (error) {
      warnings.push(
        `Search "${query}" could not be completed: ${
          error instanceof Error
            ? error.message
            : "Unknown code-search error."
        }`
      );
    }
  }

  return {
    searches,

    warnings,
  };
}

/*
 * ============================================================
 * MAIN PLAN CREATOR
 * ============================================================
 */

export async function createRoyalOSDeveloperPlan(
  request:
    CreateRoyalOSDeveloperPlanRequest
): Promise<RoyalOSDeveloperPlanningResult> {
  const policy =
    getRoyalOSDeveloperSecurityPolicy();

  const instruction =
    cleanRequiredText(
      request.instruction,
      "Development instruction",
      MAXIMUM_INSTRUCTION_LENGTH
    );

  const requestId =
    cleanOptionalText(
      request.requestId
    ) ||
    createIdentifier(
      "developer_request"
    );

  const employee =
    request.employee ??
    "Orion";

  const requestedPaths =
    uniqueStrings(
      request.paths || []
    )
      .map(
        normalizePath
      )
      .slice(
        0,
        policy.maximumFilesPerRequest
      );

  const extractedPaths =
    extractPathsFromInstruction(
      instruction
    );

  const inspectionPaths =
    uniqueStrings([
      ...requestedPaths,
      ...extractedPaths,
    ]);

  const inspection =
    await inspectRoyalOSDeveloperProject({
      requestId,

      instruction,

      employee,

      workspace:
        request.workspace,

      paths:
        inspectionPaths.length >
          0
          ? inspectionPaths
          : undefined,

      includeTree:
        true,

      includeContents:
        request.includeContents ??
        false,

      maximumDepth:
        inspectionPaths.length >
          0
          ? 5
          : 3,

      maximumFiles:
        request.maximumFiles ??
        Math.min(
          30,
          policy.maximumFilesPerRequest
        ),

      metadata:
        request.metadata,
    });

  const searchExecution =
    await runPlanningSearches({
      requestId,

      employee,

      workspace:
        request.workspace,

      paths:
        inspectionPaths,

      queries:
        request.searchQueries || [],
    });

  const groundedPaths =
    collectGroundedPaths({
      requestedPaths,

      extractedPaths,

      inspection,

      searches:
        searchExecution.searches,
    });

  const analysis =
    analyzeDeveloperInstruction(
      instruction
    );

  const affectedPaths =
    groundedPaths.slice(
      0,
      MAXIMUM_AFFECTED_PATHS
    );

  const riskLevel =
    calculateRiskLevel(
      analysis,
      affectedPaths
    );

  const supportingEmployees =
    selectSupportingEmployees(
      analysis,
      instruction
    ).filter(
      (
        supportingEmployee
      ) =>
        supportingEmployee !==
        employee
    );

  const validationCommands =
    buildValidationCommands({
      packageManager:
        inspection.project
          .packageManager,

      analysis,

      affectedPaths,
    });

  const requiresCEOApproval =
    analysis.requiresCodeChanges ||
    analysis.requiresDatabaseChanges ||
    analysis.requiresPackageChanges ||
    analysis.requiresDeployment;

  const status:
    RoyalOSDeveloperRequestStatus =
      requiresCEOApproval
        ? "awaiting_approval"
        : "succeeded";

  const risks =
    getRiskReasons(
      analysis,
      riskLevel,
      affectedPaths
    );

  const assumptions = [
    "The approved project root is the RoyalOS application directory configured by the server.",

    "Stage 1 of the Orion Developer Workbench remains read-only.",

    "No file changes, terminal commands, package installations, database changes, or deployments are performed while creating this plan.",

    affectedPaths.length >
      0
      ? "The grounded project paths are the initial scope and must be confirmed again before proposed edits are generated."
      : "No exact source path was identified yet, so Orion must complete a narrower inspection before proposing edits.",
  ];

  const rollbackPlan =
    analysis.readOnly
      ? [
          "No rollback is required because the request is read-only.",
        ]
      : [
          "Create a verified backup before modifying each existing file.",

          "Apply only CEO-approved changes.",

          "Run the approved validation commands immediately after changes.",

          "Restore every affected file from backup if validation fails.",

          "Record the failed validation output before preparing a corrected proposal.",
        ];

  const steps =
    createPlanSteps({
      analysis,

      affectedPaths,

      riskLevel,

      validationCommands,

      supportingEmployees,
    });

  const plan:
    RoyalOSDeveloperPlan = {
      planId:
        createIdentifier(
          "developer_plan"
        ),

      requestId,

      title:
        titleFromInstruction(
          instruction
        ),

      objective:
        sentenceFromInstruction(
          instruction
        ),

      summary:
        analysis.readOnly
          ? `Orion will inspect and explain the approved RoyalOS project scope without changing files. ${affectedPaths.length} grounded path(s) were identified.`
          : `Orion will prepare a controlled code proposal affecting up to ${affectedPaths.length} grounded path(s). No changes may be applied without Ayobami's approval.`,

      primaryEmployee:
        employee,

      supportingEmployees,

      workspace:
        request.workspace,

      status,

      riskLevel,

      requiresCEOApproval,

      affectedPaths,

      steps,

      assumptions,

      risks,

      validationCommands,

      rollbackPlan,

      createdAt:
        new Date()
          .toISOString(),

      metadata: {
        developerIntent:
          analysis.intent,

        readOnly:
          analysis.readOnly,

        inspectionFiles:
          inspection.files.length,

        inspectionContents:
          inspection.contents.length,

        blockedPaths:
          inspection.blockedPaths.length,

        searchesRun:
          searchExecution
            .searches
            .length,

        searchMatches:
          searchExecution.searches.reduce(
            (
              total,
              search
            ) =>
              total +
              search.matches.length,
            0
          ),

        projectFramework:
          inspection.project
            .framework ??
          null,

        packageManager:
          inspection.project
            .packageManager ??
          null,

        requestedBy:
          "Ayobami",

        workbenchStage:
          "read-only-planning",
      },
    };

  const warnings =
    uniqueStrings([
      ...inspection.warnings,

      ...searchExecution.warnings,

      affectedPaths.length ===
      0
        ? "Orion did not identify an exact affected file yet. A targeted code search should be completed before a change proposal."
        : undefined,

      groundedPaths.length >
      MAXIMUM_AFFECTED_PATHS
        ? `Only the first ${MAXIMUM_AFFECTED_PATHS} grounded paths were included in the initial affected-file scope.`
        : undefined,

      policy.readOnly
        ? "The Developer Workbench is read-only. This plan cannot modify project files."
        : undefined,
    ]);

  return {
    plan,

    inspection,

    searches:
      searchExecution.searches,

    groundedPaths,

    warnings,
  };
}

/*
 * ============================================================
 * CONVENIENCE PLANNERS
 * ============================================================
 */

export async function createRoyalOSReadOnlyInspectionPlan(
  values: {
    instruction: string;

    workspace:
      RoyalOSWorkspace;

    paths?: string[];

    searchQueries?: string[];
  }
): Promise<RoyalOSDeveloperPlanningResult> {
  return createRoyalOSDeveloperPlan({
    instruction:
      `Inspect and explain the following without changing any project files: ${values.instruction}`,

    employee:
      "Orion",

    workspace:
      values.workspace,

    paths:
      values.paths,

    searchQueries:
      values.searchQueries,

    includeContents:
      false,
  });
}

export async function createRoyalOSDebuggingPlan(
  values: {
    problem: string;

    workspace:
      RoyalOSWorkspace;

    paths?: string[];

    searchQueries?: string[];
  }
): Promise<RoyalOSDeveloperPlanningResult> {
  return createRoyalOSDeveloperPlan({
    instruction:
      `Inspect the RoyalOS project, identify the cause of this problem, and prepare a safe code-fix proposal without applying it: ${values.problem}`,

    employee:
      "Orion",

    workspace:
      values.workspace,

    paths:
      values.paths,

    searchQueries:
      values.searchQueries,

    includeContents:
      false,
  });
}