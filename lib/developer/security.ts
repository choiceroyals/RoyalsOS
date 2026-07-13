import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type {
  RoyalOSDeveloperAccessLevel,
  RoyalOSDeveloperFileCategory,
  RoyalOSDeveloperLanguage,
  RoyalOSDeveloperPathDecision,
  RoyalOSDeveloperSecurityPolicy,
} from "@/lib/developer/types";

/*
 * ============================================================
 * SECURITY CONSTANTS
 * ============================================================
 */

const DEFAULT_ALLOWED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".htm",
  ".md",
  ".mdx",
  ".sql",
  ".sh",
  ".bash",
  ".bat",
  ".cmd",
  ".ps1",
  ".py",
  ".php",
  ".xml",
  ".yml",
  ".yaml",
  ".txt",
] as const;

const DEFAULT_BLOCKED_FILE_NAMES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.test",
  ".env.test.local",
  ".env.production",
  ".env.production.local",

  "credentials",
  "credentials.json",
  "secrets.json",
  "secret.json",
  "service-account.json",
  "service_account.json",

  "id_rsa",
  "id_rsa.pub",
  "id_ed25519",
  "id_ed25519.pub",

  "npmrc",
  ".npmrc",
  "yarnrc",
  ".yarnrc",
  ".pypirc",

  "keystore",
  "keystore.jks",
  "release.keystore",
  "upload-keystore.jks",
] as const;

const DEFAULT_BLOCKED_DIRECTORY_NAMES = [
  "node_modules",
  ".next",
  ".git",
  ".github-private",
  ".idea",
  ".vscode-private",
  ".turbo",
  ".cache",
  ".vercel",

  "coverage",
  "dist",
  "build",
  "out",

  "secrets",
  "credentials",
  "certificates",
  "private",
  ".ssh",

  "backups",
  ".royalos-backups",

  /*
   * Uploaded and generated user assets are intentionally blocked
   * from Orion's source-code reader.
   */
  "royalos-assets",
] as const;

const DEFAULT_BLOCKED_PATH_FRAGMENTS = [
  "/storage/private/",
  "/private-keys/",
  "/private_keys/",
  "/service-accounts/",
  "/service_accounts/",
  "/authentication/",
] as const;

const LOCK_FILE_NAMES =
  new Set([
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
  ]);

const PACKAGE_FILE_NAMES =
  new Set([
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.ts",
    "postcss.config.js",
    "postcss.config.mjs",
    "tailwind.config.js",
    "tailwind.config.ts",
  ]);

const ALLOWED_EXTENSIONLESS_FILES =
  new Set([
    "license",
    "readme",
    "dockerfile",
    "procfile",
  ]);

const SECRET_EXTENSIONS =
  new Set([
    ".pem",
    ".key",
    ".p12",
    ".pfx",
    ".jks",
    ".keystore",
    ".cer",
    ".crt",
    ".der",
  ]);

const BINARY_ASSET_EXTENSIONS =
  new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",
    ".ico",
    ".svg",

    ".mp3",
    ".wav",
    ".m4a",
    ".aac",

    ".mp4",
    ".mov",
    ".avi",
    ".webm",

    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",

    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
  ]);

/*
 * ============================================================
 * SECURITY POLICY
 * ============================================================
 */

function resolveProjectRoot(): string {
  const configuredRoot =
    process.env
      .ROYALOS_PROJECT_ROOT
      ?.trim();

  return path.resolve(
    configuredRoot ||
      process.cwd()
  );
}

export function getRoyalOSDeveloperSecurityPolicy():
  RoyalOSDeveloperSecurityPolicy {
  return {
    projectRoot:
      resolveProjectRoot(),

    /*
     * Stage 1 is strictly read-only.
     */
    readOnly:
      true,

    allowedExtensions: [
      ...DEFAULT_ALLOWED_EXTENSIONS,
    ],

    blockedFileNames: [
      ...DEFAULT_BLOCKED_FILE_NAMES,
    ],

    blockedDirectoryNames: [
      ...DEFAULT_BLOCKED_DIRECTORY_NAMES,
    ],

    blockedPathFragments: [
      ...DEFAULT_BLOCKED_PATH_FRAGMENTS,
    ],

    maximumFileBytes:
      2 * 1024 * 1024,

    maximumReadCharacters:
      200_000,

    maximumFilesPerRequest:
      50,

    allowHiddenFiles:
      false,

    allowPackageFiles:
      true,

    allowLockFiles:
      false,

    allowUploads:
      false,

    allowTerminal:
      false,

    allowWrites:
      false,

    allowDeletes:
      false,

    allowPackageInstallation:
      false,

    allowDatabaseChanges:
      false,

    requireApprovalForWrites:
      true,

    requireBackupBeforeWrites:
      true,
  };
}

/*
 * ============================================================
 * PATH HELPERS
 * ============================================================
 */

function normalizeSlashes(
  value: string
): string {
  return value.replace(
    /\\/g,
    "/"
  );
}

function normalizePathForComparison(
  value: string
): string {
  const normalized =
    normalizeSlashes(
      path.resolve(value)
    );

  return process.platform ===
    "win32"
    ? normalized.toLowerCase()
    : normalized;
}

function normalizeRelativePath(
  value: string
): string {
  const normalized =
    normalizeSlashes(value)
      .replace(
        /^\.\/+/,
        ""
      );

  return normalized || ".";
}

function getPathSegments(
  relativePath: string
): string[] {
  if (
    relativePath === "."
  ) {
    return [];
  }

  return relativePath
    .split("/")
    .filter(Boolean);
}

function isPathInsideRoot(
  projectRoot: string,
  candidatePath: string
): boolean {
  const normalizedRoot =
    normalizePathForComparison(
      projectRoot
    );

  const normalizedCandidate =
    normalizePathForComparison(
      candidatePath
    );

  return (
    normalizedCandidate ===
      normalizedRoot ||
    normalizedCandidate.startsWith(
      `${normalizedRoot}/`
    )
  );
}

function resolveCandidatePath(
  requestedPath: string,
  projectRoot: string
): string {
  if (
    path.isAbsolute(
      requestedPath
    )
  ) {
    return path.resolve(
      requestedPath
    );
  }

  return path.resolve(
    projectRoot,
    requestedPath
  );
}

function getRelativePath(
  projectRoot: string,
  absolutePath: string
): string {
  return normalizeRelativePath(
    path.relative(
      projectRoot,
      absolutePath
    )
  );
}

/*
 * ============================================================
 * FILE CLASSIFICATION
 * ============================================================
 */

export function detectRoyalOSDeveloperLanguage(
  filePath: string
): RoyalOSDeveloperLanguage {
  const normalized =
    filePath.toLowerCase();

  if (
    normalized.endsWith(
      ".tsx"
    )
  ) {
    return "typescript-react";
  }

  if (
    normalized.endsWith(
      ".ts"
    )
  ) {
    return "typescript";
  }

  if (
    normalized.endsWith(
      ".jsx"
    )
  ) {
    return "javascript-react";
  }

  if (
    normalized.endsWith(
      ".js"
    ) ||
    normalized.endsWith(
      ".mjs"
    ) ||
    normalized.endsWith(
      ".cjs"
    )
  ) {
    return "javascript";
  }

  if (
    normalized.endsWith(
      ".json"
    )
  ) {
    return "json";
  }

  if (
    normalized.endsWith(
      ".css"
    )
  ) {
    return "css";
  }

  if (
    normalized.endsWith(
      ".scss"
    ) ||
    normalized.endsWith(
      ".sass"
    ) ||
    normalized.endsWith(
      ".less"
    )
  ) {
    return "scss";
  }

  if (
    normalized.endsWith(
      ".html"
    ) ||
    normalized.endsWith(
      ".htm"
    )
  ) {
    return "html";
  }

  if (
    normalized.endsWith(
      ".md"
    ) ||
    normalized.endsWith(
      ".mdx"
    )
  ) {
    return "markdown";
  }

  if (
    normalized.endsWith(
      ".sql"
    )
  ) {
    return "sql";
  }

  if (
    normalized.endsWith(
      ".sh"
    ) ||
    normalized.endsWith(
      ".bash"
    ) ||
    normalized.endsWith(
      ".bat"
    ) ||
    normalized.endsWith(
      ".cmd"
    )
  ) {
    return "shell";
  }

  if (
    normalized.endsWith(
      ".ps1"
    )
  ) {
    return "powershell";
  }

  if (
    normalized.endsWith(
      ".py"
    )
  ) {
    return "python";
  }

  if (
    normalized.endsWith(
      ".php"
    )
  ) {
    return "php";
  }

  if (
    normalized.endsWith(
      ".xml"
    )
  ) {
    return "xml";
  }

  if (
    normalized.endsWith(
      ".yml"
    ) ||
    normalized.endsWith(
      ".yaml"
    )
  ) {
    return "yaml";
  }

  if (
    normalized.endsWith(
      ".txt"
    )
  ) {
    return "text";
  }

  return "unknown";
}

export function classifyRoyalOSDeveloperFile(
  filePath: string
): RoyalOSDeveloperFileCategory {
  const normalized =
    normalizeSlashes(
      filePath
    ).toLowerCase();

  const fileName =
    path.basename(
      normalized
    );

  const extension =
    path.extname(
      fileName
    );

  const segments =
    normalized
      .split("/")
      .filter(Boolean);

  if (
    DEFAULT_BLOCKED_FILE_NAMES.includes(
      fileName as
        (typeof DEFAULT_BLOCKED_FILE_NAMES)[number]
    ) ||
    SECRET_EXTENSIONS.has(
      extension
    ) ||
    fileName.startsWith(
      ".env"
    )
  ) {
    return "secret";
  }

  if (
    segments.some(
      (segment) =>
        segment ===
          "node_modules"
    )
  ) {
    return "dependency";
  }

  if (
    segments.some(
      (segment) =>
        [
          ".next",
          "dist",
          "build",
          "out",
          "coverage",
        ].includes(
          segment
        )
    )
  ) {
    return "generated";
  }

  if (
    BINARY_ASSET_EXTENSIONS.has(
      extension
    )
  ) {
    return "asset";
  }

  if (
    fileName ===
      "package.json" ||
    fileName ===
      "tsconfig.json" ||
    fileName ===
      "jsconfig.json" ||
    fileName.includes(
      ".config."
    )
  ) {
    return "configuration";
  }

  if (
    extension === ".css" ||
    extension === ".scss" ||
    extension === ".sass" ||
    extension === ".less"
  ) {
    return "stylesheet";
  }

  if (
    extension === ".md" ||
    extension === ".mdx" ||
    fileName === "readme" ||
    fileName.startsWith(
      "readme."
    )
  ) {
    return "documentation";
  }

  if (
    extension === ".json" ||
    extension === ".yaml" ||
    extension === ".yml" ||
    extension === ".xml" ||
    extension === ".sql"
  ) {
    return "data";
  }

  if (
    [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".py",
      ".php",
      ".html",
      ".htm",
      ".sh",
      ".bat",
      ".cmd",
      ".ps1",
    ].includes(
      extension
    )
  ) {
    return "source";
  }

  return "unknown";
}

/*
 * ============================================================
 * ACCESS EVALUATION
 * ============================================================
 */

export type EvaluateRoyalOSDeveloperPathOptions = {
  accessLevel?:
    RoyalOSDeveloperAccessLevel;

  isDirectory?:
    boolean;

  policy?:
    RoyalOSDeveloperSecurityPolicy;
};

function createDeniedDecision(
  values: {
    relativePath:
      string | null;

    absolutePath:
      string | null;

    category:
      RoyalOSDeveloperFileCategory;

    reason:
      string;

    matchedRule?: string;
  }
): RoyalOSDeveloperPathDecision {
  return {
    allowed:
      false,

    accessLevel:
      "none",

    relativePath:
      values.relativePath,

    absolutePath:
      values.absolutePath,

    category:
      values.category,

    reason:
      values.reason,

    matchedRule:
      values.matchedRule,
  };
}

export function evaluateRoyalOSDeveloperPath(
  requestedPath: string,
  options:
    EvaluateRoyalOSDeveloperPathOptions = {}
): RoyalOSDeveloperPathDecision {
  const policy =
    options.policy ??
    getRoyalOSDeveloperSecurityPolicy();

  const requestedAccess =
    options.accessLevel ??
    "read";

  if (
    typeof requestedPath !==
      "string" ||
    !requestedPath.trim()
  ) {
    return createDeniedDecision({
      relativePath:
        null,

      absolutePath:
        null,

      category:
        "unknown",

      reason:
        "A project path is required.",
    });
  }

  if (
    requestedPath.includes(
      "\0"
    )
  ) {
    return createDeniedDecision({
      relativePath:
        null,

      absolutePath:
        null,

      category:
        "system",

      reason:
        "The requested path contains an invalid null character.",

      matchedRule:
        "null-character",
    });
  }

  const projectRoot =
    path.resolve(
      policy.projectRoot
    );

  const absolutePath =
    resolveCandidatePath(
      requestedPath.trim(),
      projectRoot
    );

  const relativePath =
    getRelativePath(
      projectRoot,
      absolutePath
    );

  const category =
    classifyRoyalOSDeveloperFile(
      relativePath
    );

  if (
    !isPathInsideRoot(
      projectRoot,
      absolutePath
    )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category:
        "system",

      reason:
        "Orion cannot access files outside the approved RoyalOS project root.",

      matchedRule:
        "outside-project-root",
    });
  }

  if (
    requestedAccess ===
      "write" &&
    (
      policy.readOnly ||
      !policy.allowWrites
    )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category,

      reason:
        "The Orion Developer Workbench is currently read-only. File writing has not been enabled.",

      matchedRule:
        "writes-disabled",
    });
  }

  if (
    requestedAccess ===
      "delete" &&
    !policy.allowDeletes
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category,

      reason:
        "File deletion is disabled for Orion.",

      matchedRule:
        "deletes-disabled",
    });
  }

  const segments =
    getPathSegments(
      relativePath
    );

  const normalizedSegments =
    segments.map(
      (segment) =>
        segment.toLowerCase()
    );

  const blockedDirectory =
    normalizedSegments.find(
      (segment) =>
        policy
          .blockedDirectoryNames
          .some(
            (blockedName) =>
              segment ===
              blockedName.toLowerCase()
          )
    );

  if (
    blockedDirectory
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category:
        classifyRoyalOSDeveloperFile(
          relativePath
        ),

      reason:
        `Access to the "${blockedDirectory}" directory is blocked by the RoyalOS developer security policy.`,

      matchedRule:
        `blocked-directory:${blockedDirectory}`,
    });
  }

  const fileName =
    path.basename(
      relativePath
    );

  const normalizedFileName =
    fileName.toLowerCase();

  const blockedFile =
    policy
      .blockedFileNames
      .find(
        (blockedName) =>
          normalizedFileName ===
          blockedName.toLowerCase()
      );

  if (
    blockedFile ||
    normalizedFileName.startsWith(
      ".env"
    )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category:
        "secret",

      reason:
        "This file may contain credentials, API keys, passwords, or other secrets and cannot be read by Orion.",

      matchedRule:
        blockedFile
          ? `blocked-file:${blockedFile}`
          : "blocked-env-file",
    });
  }

  if (
    !policy.allowHiddenFiles &&
    normalizedSegments.some(
      (segment) =>
        segment.startsWith(
          "."
        )
    )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category,

      reason:
        "Hidden files and hidden directories are disabled for Orion.",

      matchedRule:
        "hidden-path",
    });
  }

  const normalizedForRules =
    `/${normalizeSlashes(
      relativePath
    ).toLowerCase()}/`;

  const blockedFragment =
    policy
      .blockedPathFragments
      .find(
        (fragment) =>
          normalizedForRules.includes(
            normalizeSlashes(
              fragment
            ).toLowerCase()
          )
      );

  if (
    blockedFragment
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category,

      reason:
        "This project location is blocked by the RoyalOS developer security policy.",

      matchedRule:
        `blocked-fragment:${blockedFragment}`,
    });
  }

  const extension =
    path.extname(
      normalizedFileName
    );

  if (
    SECRET_EXTENSIONS.has(
      extension
    )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category:
        "secret",

      reason:
        "Private keys, certificates, and keystore files cannot be accessed by Orion.",

      matchedRule:
        `secret-extension:${extension}`,
    });
  }

  if (
    LOCK_FILE_NAMES.has(
      normalizedFileName
    ) &&
    !policy.allowLockFiles
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category:
        "dependency",

      reason:
        "Package lock files are excluded from Orion's read-only inspection.",

      matchedRule:
        "lock-files-disabled",
    });
  }

  if (
    PACKAGE_FILE_NAMES.has(
      normalizedFileName
    ) &&
    !policy.allowPackageFiles
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category:
        "configuration",

      reason:
        "Package and framework configuration files are disabled by policy.",

      matchedRule:
        "package-files-disabled",
    });
  }

  if (
    !options.isDirectory &&
    BINARY_ASSET_EXTENSIONS.has(
      extension
    )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category:
        "asset",

      reason:
        "Binary assets are not read as source code by the Orion Developer Workbench.",

      matchedRule:
        `binary-asset:${extension}`,
    });
  }

  if (
    !options.isDirectory &&
    extension &&
    !policy
      .allowedExtensions
      .some(
        (allowedExtension) =>
          extension ===
          allowedExtension.toLowerCase()
      )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category,

      reason:
        `The "${extension}" file type is not approved for Orion's source-code reader.`,

      matchedRule:
        `unsupported-extension:${extension}`,
    });
  }

  if (
    !options.isDirectory &&
    !extension &&
    relativePath !== "." &&
    !ALLOWED_EXTENSIONLESS_FILES.has(
      normalizedFileName
    )
  ) {
    return createDeniedDecision({
      relativePath,

      absolutePath,

      category,

      reason:
        "Extensionless files are blocked unless they are recognized project documentation or configuration files.",

      matchedRule:
        "unknown-extensionless-file",
    });
  }

  return {
    allowed:
      true,

    accessLevel:
      requestedAccess,

    relativePath,

    absolutePath,

    category,

    reason:
      requestedAccess ===
      "propose"
        ? "Orion may inspect this approved path and propose changes, but cannot apply them."
        : "Orion may read this approved project path.",

    matchedRule:
      "approved-project-path",
  };
}

/*
 * ============================================================
 * SYMLINK-SAFE PATH CHECK
 * ============================================================
 */

export async function evaluateRoyalOSDeveloperPathSecurely(
  requestedPath: string,
  options:
    EvaluateRoyalOSDeveloperPathOptions = {}
): Promise<RoyalOSDeveloperPathDecision> {
  const policy =
    options.policy ??
    getRoyalOSDeveloperSecurityPolicy();

  const initialDecision =
    evaluateRoyalOSDeveloperPath(
      requestedPath,
      {
        ...options,
        policy,
      }
    );

  if (
    !initialDecision.allowed ||
    !initialDecision.absolutePath
  ) {
    return initialDecision;
  }

  try {
    const [
      realProjectRoot,
      realCandidatePath,
    ] =
      await Promise.all([
        fs.realpath(
          policy.projectRoot
        ),

        fs.realpath(
          initialDecision.absolutePath
        ),
      ]);

    if (
      !isPathInsideRoot(
        realProjectRoot,
        realCandidatePath
      )
    ) {
      return createDeniedDecision({
        relativePath:
          initialDecision.relativePath,

        absolutePath:
          realCandidatePath,

        category:
          initialDecision.category,

        reason:
          "The requested path resolves through a symbolic link to a location outside the RoyalOS project.",

        matchedRule:
          "symlink-outside-project-root",
      });
    }

    return {
      ...initialDecision,

      absolutePath:
        realCandidatePath,
    };
  } catch (error) {
    const possibleError =
      error as NodeJS.ErrnoException;

    /*
     * A missing path may later be used only for a proposed file.
     * It is not automatically granted write access.
     */

    if (
      possibleError.code ===
      "ENOENT" &&
      (
        options.accessLevel ===
        "propose"
      )
    ) {
      return initialDecision;
    }

    return createDeniedDecision({
      relativePath:
        initialDecision.relativePath,

      absolutePath:
        initialDecision.absolutePath,

      category:
        initialDecision.category,

      reason:
        possibleError.code ===
        "ENOENT"
          ? "The requested project path does not exist."
          : "RoyalOS could not safely resolve the requested project path.",

      matchedRule:
        possibleError.code
          ? `filesystem:${possibleError.code}`
          : "filesystem-resolution-error",
    });
  }
}

export async function requireRoyalOSDeveloperPath(
  requestedPath: string,
  options:
    EvaluateRoyalOSDeveloperPathOptions = {}
): Promise<RoyalOSDeveloperPathDecision> {
  const decision =
    await evaluateRoyalOSDeveloperPathSecurely(
      requestedPath,
      options
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
 * FILE SIZE CHECK
 * ============================================================
 */

export function evaluateRoyalOSDeveloperFileSize(
  sizeBytes: number,
  policy =
    getRoyalOSDeveloperSecurityPolicy()
): {
  allowed: boolean;
  reason: string;
} {
  if (
    !Number.isFinite(
      sizeBytes
    ) ||
    sizeBytes < 0
  ) {
    return {
      allowed:
        false,

      reason:
        "RoyalOS received an invalid file size.",
    };
  }

  if (
    sizeBytes >
    policy.maximumFileBytes
  ) {
    return {
      allowed:
        false,

      reason:
        `The file exceeds Orion's ${policy.maximumFileBytes.toLocaleString()}-byte read limit.`,
    };
  }

  return {
    allowed:
      true,

    reason:
      "The file is within Orion's approved read limit.",
  };
}

/*
 * ============================================================
 * CONTENT SECRET DETECTION AND REDACTION
 * ============================================================
 */

export type RoyalOSDeveloperSecretFinding = {
  type: string;
  description: string;
};

const SECRET_PATTERNS: Array<{
  type: string;
  description: string;
  pattern: RegExp;
}> = [
  {
    type:
      "private-key",

    description:
      "A private-key block was detected.",

    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi,
  },

  {
    type:
      "bearer-token",

    description:
      "A bearer authentication token was detected.",

    pattern:
      /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
  },

  {
    type:
      "environment-secret",

    description:
      "A likely environment secret assignment was detected.",

    pattern:
      /\b(?:OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|DATABASE_URL|JWT_SECRET|API_SECRET|ACCESS_TOKEN|REFRESH_TOKEN|PRIVATE_KEY|PASSWORD)\b\s*[:=]\s*["']?[^"'\s,;]{8,}/gi,
  },

  {
    type:
      "generic-api-key",

    description:
      "A likely hard-coded API key was detected.",

    pattern:
      /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\b\s*[:=]\s*["'][^"']{12,}["']/gi,
  },
];

export function scanRoyalOSDeveloperContentForSecrets(
  content: string
): RoyalOSDeveloperSecretFinding[] {
  const findings:
    RoyalOSDeveloperSecretFinding[] = [];

  for (
    const rule of
    SECRET_PATTERNS
  ) {
    rule.pattern.lastIndex =
      0;

    if (
      rule.pattern.test(
        content
      )
    ) {
      findings.push({
        type:
          rule.type,

        description:
          rule.description,
      });
    }
  }

  return findings;
}

export function redactRoyalOSDeveloperContent(
  content: string
): {
  content: string;
  redacted: boolean;
  findings:
    RoyalOSDeveloperSecretFinding[];
} {
  const findings =
    scanRoyalOSDeveloperContentForSecrets(
      content
    );

  let safeContent =
    content;

  for (
    const rule of
    SECRET_PATTERNS
  ) {
    rule.pattern.lastIndex =
      0;

    safeContent =
      safeContent.replace(
        rule.pattern,
        `[REDACTED ${rule.type.toUpperCase()}]`
      );
  }

  return {
    content:
      safeContent,

    redacted:
      findings.length > 0,

    findings,
  };
}

/*
 * ============================================================
 * POLICY SUMMARY
 * ============================================================
 */

export function getRoyalOSDeveloperSecuritySummary() {
  const policy =
    getRoyalOSDeveloperSecurityPolicy();

  return {
    projectRoot:
      policy.projectRoot,

    mode:
      policy.readOnly
        ? "read-only"
        : "write-enabled",

    allowedExtensions:
      policy.allowedExtensions,

    maximumFileBytes:
      policy.maximumFileBytes,

    maximumReadCharacters:
      policy.maximumReadCharacters,

    maximumFilesPerRequest:
      policy.maximumFilesPerRequest,

    protections: {
      secretsBlocked:
        true,

      hiddenFilesBlocked:
        !policy.allowHiddenFiles,

      dependenciesBlocked:
        true,

      generatedFilesBlocked:
        true,

      uploadedAssetsBlocked:
        !policy.allowUploads,

      terminalBlocked:
        !policy.allowTerminal,

      writesBlocked:
        !policy.allowWrites,

      deletesBlocked:
        !policy.allowDeletes,

      packageInstallationBlocked:
        !policy.allowPackageInstallation,

      databaseChangesBlocked:
        !policy.allowDatabaseChanges,

      symlinkEscapeProtection:
        true,

      contentSecretRedaction:
        true,
    },
  };
}