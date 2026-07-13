import "server-only";

import {
  createHash,
} from "node:crypto";

import type {
  Dirent,
  Stats,
} from "node:fs";

import fs from "node:fs/promises";
import path from "node:path";

import {
  classifyRoyalOSDeveloperFile,
  detectRoyalOSDeveloperLanguage,
  evaluateRoyalOSDeveloperFileSize,
  evaluateRoyalOSDeveloperPathSecurely,
  getRoyalOSDeveloperSecurityPolicy,
  redactRoyalOSDeveloperContent,
  requireRoyalOSDeveloperPath,
} from "@/lib/developer/security";

import type {
  RoyalOSDeveloperFileContent,
  RoyalOSDeveloperFileReference,
  RoyalOSDeveloperInspectionRequest,
  RoyalOSDeveloperInspectionResult,
  RoyalOSDeveloperProject,
  RoyalOSDeveloperSecurityPolicy,
  RoyalOSDeveloperTreeNode,
} from "@/lib/developer/types";

/*
 * ============================================================
 * PUBLIC OPTION TYPES
 * ============================================================
 */

export type ReadRoyalOSDeveloperFileOptions = {
  maximumCharacters?: number;

  includeSha256?: boolean;

  policy?:
    RoyalOSDeveloperSecurityPolicy;
};

export type ListRoyalOSDeveloperFilesOptions = {
  paths?: string[];

  maximumDepth?: number;

  maximumFiles?: number;

  includeTree?: boolean;

  policy?:
    RoyalOSDeveloperSecurityPolicy;
};

export type RoyalOSDeveloperFileListResult = {
  files:
    RoyalOSDeveloperFileReference[];

  tree:
    RoyalOSDeveloperTreeNode[];

  blockedPaths:
    Array<{
      path: string;
      reason: string;
    }>;

  warnings:
    string[];

  truncated:
    boolean;
};

/*
 * ============================================================
 * INTERNAL TYPES
 * ============================================================
 */

type PackageJsonLike = {
  name?: unknown;

  version?: unknown;

  packageManager?: unknown;

  dependencies?: unknown;

  devDependencies?: unknown;
};

type ProjectWalkState = {
  policy:
    RoyalOSDeveloperSecurityPolicy;

  maximumDepth:
    number;

  maximumFiles:
    number;

  files:
    Map<
      string,
      RoyalOSDeveloperFileReference
    >;

  blockedPaths:
    Array<{
      path: string;
      reason: string;
    }>;

  warnings:
    string[];

  truncated:
    boolean;
};

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function cleanRequiredText(
  value: unknown,
  fieldName: string
): string {
  const cleaned =
    typeof value ===
      "string"
      ? value.trim()
      : "";

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required for the Orion Developer Workbench.`
    );
  }

  return cleaned;
}

function cleanOptionalText(
  value: unknown
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    undefined;
}

function normalizeMaximumDepth(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 5;
  }

  return Math.min(
    12,
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

function normalizeMaximumCharacters(
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
      .maximumReadCharacters;
  }

  return Math.min(
    policy.maximumReadCharacters,
    Math.max(
      1_000,
      Math.floor(value)
    )
  );
}

function normalizeSlashes(
  value: string
): string {
  return value.replace(
    /\\/g,
    "/"
  );
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

  return normalized ||
    ".";
}

function createRequestId(): string {
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

  return `developer_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function calculateLineCount(
  content: string
): number {
  if (!content) {
    return 0;
  }

  return content.split(
    /\r\n|\r|\n/
  ).length;
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

function looksLikeBinaryContent(
  buffer: Buffer
): boolean {
  const inspectionLength =
    Math.min(
      buffer.length,
      8_192
    );

  for (
    let index = 0;
    index <
      inspectionLength;
    index += 1
  ) {
    if (
      buffer[index] ===
      0
    ) {
      return true;
    }
  }

  return false;
}

function createBlockedPathEntry(
  pathValue: string,
  reason: string
): {
  path: string;
  reason: string;
} {
  return {
    path:
      normalizeRelativePath(
        pathValue
      ),

    reason,
  };
}

function addBlockedPath(
  state:
    ProjectWalkState,
  pathValue: string,
  reason: string
): void {
  const normalizedPath =
    normalizeRelativePath(
      pathValue
    );

  const alreadyRecorded =
    state.blockedPaths.some(
      (item) =>
        item.path ===
          normalizedPath &&
        item.reason ===
          reason
    );

  if (!alreadyRecorded) {
    state.blockedPaths.push(
      createBlockedPathEntry(
        normalizedPath,
        reason
      )
    );
  }
}

/*
 * ============================================================
 * PROJECT METADATA
 * ============================================================
 */

async function fileExists(
  absolutePath: string
): Promise<boolean> {
  try {
    await fs.access(
      absolutePath
    );

    return true;
  } catch {
    return false;
  }
}

async function readPackageJsonSafely(
  policy:
    RoyalOSDeveloperSecurityPolicy
): Promise<
  PackageJsonLike | null
> {
  const decision =
    await evaluateRoyalOSDeveloperPathSecurely(
      "package.json",
      {
        accessLevel:
          "read",

        isDirectory:
          false,

        policy,
      }
    );

  if (
    !decision.allowed ||
    !decision.absolutePath
  ) {
    return null;
  }

  try {
    const content =
      await fs.readFile(
        decision.absolutePath,
        "utf8"
      );

    const parsed =
      JSON.parse(
        content
      ) as PackageJsonLike;

    return parsed &&
      typeof parsed ===
        "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function getDependencyNames(
  packageJson:
    PackageJsonLike | null
): Set<string> {
  const names =
    new Set<string>();

  if (!packageJson) {
    return names;
  }

  for (
    const candidate of [
      packageJson.dependencies,
      packageJson
        .devDependencies,
    ]
  ) {
    if (
      !candidate ||
      typeof candidate !==
        "object" ||
      Array.isArray(candidate)
    ) {
      continue;
    }

    for (
      const dependencyName of
      Object.keys(candidate)
    ) {
      names.add(
        dependencyName
      );
    }
  }

  return names;
}

function detectFramework(
  dependencies:
    Set<string>
): string | undefined {
  if (
    dependencies.has(
      "next"
    )
  ) {
    return "Next.js";
  }

  if (
    dependencies.has(
      "@remix-run/react"
    )
  ) {
    return "Remix";
  }

  if (
    dependencies.has(
      "nuxt"
    )
  ) {
    return "Nuxt";
  }

  if (
    dependencies.has(
      "react"
    )
  ) {
    return "React";
  }

  if (
    dependencies.has(
      "vue"
    )
  ) {
    return "Vue";
  }

  if (
    dependencies.has(
      "@angular/core"
    )
  ) {
    return "Angular";
  }

  if (
    dependencies.has(
      "svelte"
    )
  ) {
    return "Svelte";
  }

  return undefined;
}

async function detectPackageManager(
  policy:
    RoyalOSDeveloperSecurityPolicy,
  packageJson:
    PackageJsonLike | null
): Promise<
  RoyalOSDeveloperProject["packageManager"]
> {
  const packageManagerValue =
    cleanOptionalText(
      packageJson
        ?.packageManager
    )
      ?.toLowerCase();

  if (
    packageManagerValue
      ?.startsWith(
        "pnpm"
      )
  ) {
    return "pnpm";
  }

  if (
    packageManagerValue
      ?.startsWith(
        "yarn"
      )
  ) {
    return "yarn";
  }

  if (
    packageManagerValue
      ?.startsWith(
        "bun"
      )
  ) {
    return "bun";
  }

  if (
    packageManagerValue
      ?.startsWith(
        "npm"
      )
  ) {
    return "npm";
  }

  const projectRoot =
    policy.projectRoot;

  if (
    await fileExists(
      path.join(
        projectRoot,
        "pnpm-lock.yaml"
      )
    )
  ) {
    return "pnpm";
  }

  if (
    await fileExists(
      path.join(
        projectRoot,
        "yarn.lock"
      )
    )
  ) {
    return "yarn";
  }

  if (
    await fileExists(
      path.join(
        projectRoot,
        "bun.lock"
      )
    ) ||
    await fileExists(
      path.join(
        projectRoot,
        "bun.lockb"
      )
    )
  ) {
    return "bun";
  }

  if (
    await fileExists(
      path.join(
        projectRoot,
        "package-lock.json"
      )
    )
  ) {
    return "npm";
  }

  return "unknown";
}

export async function getRoyalOSDeveloperProject(
  workspace:
    RoyalOSDeveloperProject["workspace"],
  policy =
    getRoyalOSDeveloperSecurityPolicy()
): Promise<RoyalOSDeveloperProject> {
  const packageJson =
    await readPackageJsonSafely(
      policy
    );

  const dependencyNames =
    getDependencyNames(
      packageJson
    );

  const rootStats =
    await fs.stat(
      policy.projectRoot
    );

  const packageName =
    cleanOptionalText(
      packageJson?.name
    );

  const projectName =
    packageName ||
    path.basename(
      policy.projectRoot
    ) ||
    "RoyalOS Project";

  return {
    name:
      projectName,

    rootPath:
      policy.projectRoot,

    workspace,

    framework:
      detectFramework(
        dependencyNames
      ),

    packageManager:
      await detectPackageManager(
        policy,
        packageJson
      ),

    readOnly:
      policy.readOnly,

    createdAt:
      (
        rootStats.birthtimeMs >
        0
          ? rootStats.birthtime
          : rootStats.ctime
      ).toISOString(),

    metadata: {
      packageVersion:
        cleanOptionalText(
          packageJson?.version
        ) ??
        null,

      sourceReader:
        "Orion Developer Workbench",

      maximumFilesPerRequest:
        policy
          .maximumFilesPerRequest,

      maximumFileBytes:
        policy
          .maximumFileBytes,

      maximumReadCharacters:
        policy
          .maximumReadCharacters,
    },
  };
}

/*
 * ============================================================
 * FILE REFERENCES
 * ============================================================
 */

function createFileReference(
  relativePath: string,
  stats: Stats,
  values: {
    accessLevel:
      RoyalOSDeveloperFileReference["accessLevel"];

    readable:
      boolean;

    writable:
      boolean;

    blockedReason?:
      string;

    lineCount?:
      number | null;
  }
): RoyalOSDeveloperFileReference {
  const normalizedPath =
    normalizeRelativePath(
      relativePath
    );

  const fileName =
    path.basename(
      normalizedPath
    );

  const extension =
    path.extname(
      fileName
    ).toLowerCase();

  return {
    relativePath:
      normalizedPath,

    fileName,

    extension,

    language:
      detectRoyalOSDeveloperLanguage(
        normalizedPath
      ),

    category:
      classifyRoyalOSDeveloperFile(
        normalizedPath
      ),

    sizeBytes:
      stats.size,

    lineCount:
      values.lineCount ??
      null,

    lastModifiedAt:
      Number.isFinite(
        stats.mtimeMs
      )
        ? stats.mtime
            .toISOString()
        : null,

    accessLevel:
      values.accessLevel,

    readable:
      values.readable,

    writable:
      values.writable,

    blockedReason:
      values.blockedReason,
  };
}

async function createApprovedFileReference(
  requestedPath: string,
  policy:
    RoyalOSDeveloperSecurityPolicy
): Promise<
  RoyalOSDeveloperFileReference
> {
  const decision =
    await requireRoyalOSDeveloperPath(
      requestedPath,
      {
        accessLevel:
          "read",

        isDirectory:
          false,

        policy,
      }
    );

  if (
    !decision.absolutePath ||
    !decision.relativePath
  ) {
    throw new Error(
      "RoyalOS could not resolve the approved project file."
    );
  }

  const stats =
    await fs.stat(
      decision.absolutePath
    );

  if (
    !stats.isFile()
  ) {
    throw new Error(
      `"${decision.relativePath}" is not a file.`
    );
  }

  const sizeDecision =
    evaluateRoyalOSDeveloperFileSize(
      stats.size,
      policy
    );

  if (
    !sizeDecision.allowed
  ) {
    throw new Error(
      sizeDecision.reason
    );
  }

  return createFileReference(
    decision.relativePath,
    stats,
    {
      accessLevel:
        decision.accessLevel,

      readable:
        true,

      writable:
        false,
    }
  );
}

/*
 * ============================================================
 * READ FILE CONTENT
 * ============================================================
 */

export async function readRoyalOSDeveloperFile(
  requestedPath: string,
  options:
    ReadRoyalOSDeveloperFileOptions = {}
): Promise<RoyalOSDeveloperFileContent> {
  const policy =
    options.policy ??
    getRoyalOSDeveloperSecurityPolicy();

  const cleanedPath =
    cleanRequiredText(
      requestedPath,
      "Project file path"
    );

  const decision =
    await requireRoyalOSDeveloperPath(
      cleanedPath,
      {
        accessLevel:
          "read",

        isDirectory:
          false,

        policy,
      }
    );

  if (
    !decision.absolutePath ||
    !decision.relativePath
  ) {
    throw new Error(
      "RoyalOS could not resolve the project file."
    );
  }

  const stats =
    await fs.stat(
      decision.absolutePath
    );

  if (
    !stats.isFile()
  ) {
    throw new Error(
      `"${decision.relativePath}" is not a readable file.`
    );
  }

  const sizeDecision =
    evaluateRoyalOSDeveloperFileSize(
      stats.size,
      policy
    );

  if (
    !sizeDecision.allowed
  ) {
    throw new Error(
      sizeDecision.reason
    );
  }

  const buffer =
    await fs.readFile(
      decision.absolutePath
    );

  if (
    looksLikeBinaryContent(
      buffer
    )
  ) {
    throw new Error(
      `"${decision.relativePath}" appears to contain binary data and cannot be read as source code.`
    );
  }

  const originalContent =
    buffer.toString(
      "utf8"
    );

  const redaction =
    redactRoyalOSDeveloperContent(
      originalContent
    );

  const safeContent =
    redaction.content;

  const maximumCharacters =
    normalizeMaximumCharacters(
      options
        .maximumCharacters,
      policy
    );

  const truncated =
    safeContent.length >
    maximumCharacters;

  const returnedContent =
    truncated
      ? `${safeContent.slice(
          0,
          maximumCharacters
        )}

[ROYALOS NOTICE: This file was truncated because it exceeded Orion's approved read-character limit.]`
      : safeContent;

  const file =
    createFileReference(
      decision.relativePath,
      stats,
      {
        accessLevel:
          decision.accessLevel,

        readable:
          true,

        writable:
          false,

        lineCount:
          calculateLineCount(
            safeContent
          ),
      }
    );

  return {
    file,

    content:
      returnedContent,

    truncated,

    totalCharacters:
      safeContent.length,

    returnedCharacters:
      returnedContent.length,

    sha256:
      options
        .includeSha256 ===
      false
        ? undefined
        : createSha256(
            safeContent
          ),

    loadedAt:
      new Date()
        .toISOString(),
  };
}

/*
 * ============================================================
 * DIRECTORY WALKER
 * ============================================================
 */

function sortDirectoryEntries(
  entries: Dirent[]
): Dirent[] {
  return [
    ...entries,
  ].sort(
    (
      first,
      second
    ) => {
      if (
        first.isDirectory() &&
        !second.isDirectory()
      ) {
        return -1;
      }

      if (
        !first.isDirectory() &&
        second.isDirectory()
      ) {
        return 1;
      }

      return first.name.localeCompare(
        second.name,
        undefined,
        {
          sensitivity:
            "base",
        }
      );
    }
  );
}

async function walkProjectPath(
  requestedPath: string,
  currentDepth: number,
  state:
    ProjectWalkState
): Promise<
  RoyalOSDeveloperTreeNode | null
> {
  if (
    state.files.size >=
    state.maximumFiles
  ) {
    state.truncated =
      true;

    return null;
  }

  let stats:
    Stats;

  try {
    const candidateRoot =
      path.isAbsolute(
        requestedPath
      )
        ? requestedPath
        : path.resolve(
            state.policy
              .projectRoot,
            requestedPath
          );

    stats =
      await fs.stat(
        candidateRoot
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The requested path could not be inspected.";

    addBlockedPath(
      state,
      requestedPath,
      message
    );

    return null;
  }

  const isDirectory =
    stats.isDirectory();

  const decision =
    await evaluateRoyalOSDeveloperPathSecurely(
      requestedPath,
      {
        accessLevel:
          "read",

        isDirectory,

        policy:
          state.policy,
      }
    );

  if (
    !decision.allowed ||
    !decision.absolutePath ||
    !decision.relativePath
  ) {
    addBlockedPath(
      state,
      decision.relativePath ??
        requestedPath,
      decision.reason
    );

    return {
      name:
        path.basename(
          requestedPath
        ) ||
        ".",

      relativePath:
        normalizeRelativePath(
          decision.relativePath ??
            requestedPath
        ),

      type:
        isDirectory
          ? "directory"
          : "file",

      category:
        decision.category,

      blocked:
        true,

      blockedReason:
        decision.reason,
    };
  }

  if (
    stats.isFile()
  ) {
    const sizeDecision =
      evaluateRoyalOSDeveloperFileSize(
        stats.size,
        state.policy
      );

    if (
      !sizeDecision.allowed
    ) {
      addBlockedPath(
        state,
        decision.relativePath,
        sizeDecision.reason
      );

      return {
        name:
          path.basename(
            decision.relativePath
          ),

        relativePath:
          decision.relativePath,

        type:
          "file",

        category:
          decision.category,

        blocked:
          true,

        blockedReason:
          sizeDecision.reason,
      };
    }

    const reference =
      createFileReference(
        decision.relativePath,
        stats,
        {
          accessLevel:
            decision.accessLevel,

          readable:
            true,

          writable:
            false,
        }
      );

    state.files.set(
      reference.relativePath,
      reference
    );

    return {
      name:
        reference.fileName,

      relativePath:
        reference.relativePath,

      type:
        "file",

      category:
        reference.category,

      blocked:
        false,
    };
  }

  if (
    !stats.isDirectory()
  ) {
    addBlockedPath(
      state,
      decision.relativePath,
      "The path is not a regular file or directory."
    );

    return null;
  }

  const directoryNode:
    RoyalOSDeveloperTreeNode = {
      name:
        decision.relativePath ===
        "."
          ? path.basename(
              state.policy
                .projectRoot
            )
          : path.basename(
              decision.relativePath
            ),

      relativePath:
        decision.relativePath,

      type:
        "directory",

      category:
        classifyRoyalOSDeveloperFile(
          decision.relativePath
        ),

      blocked:
        false,
  };

  if (
    currentDepth >=
    state.maximumDepth
  ) {
    return directoryNode;
  }

  let entries:
    Dirent[];

  try {
    entries =
      await fs.readdir(
        decision.absolutePath,
        {
          withFileTypes:
            true,
        }
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "RoyalOS could not read the directory.";

    addBlockedPath(
      state,
      decision.relativePath,
      message
    );

    return {
      ...directoryNode,

      blocked:
        true,

      blockedReason:
        message,
    };
  }

  const children:
    RoyalOSDeveloperTreeNode[] = [];

  for (
    const entry of
    sortDirectoryEntries(
      entries
    )
  ) {
    if (
      state.files.size >=
      state.maximumFiles
    ) {
      state.truncated =
        true;

      break;
    }

    const childRelativePath =
      decision.relativePath ===
      "."
        ? entry.name
        : normalizeRelativePath(
            `${decision.relativePath}/${entry.name}`
          );

    const childNode =
      await walkProjectPath(
        childRelativePath,
        currentDepth + 1,
        state
      );

    if (childNode) {
      children.push(
        childNode
      );
    }
  }

  if (
    children.length > 0
  ) {
    directoryNode.children =
      children;
  }

  return directoryNode;
}

/*
 * ============================================================
 * LIST PROJECT FILES
 * ============================================================
 */

export async function listRoyalOSDeveloperFiles(
  options:
    ListRoyalOSDeveloperFilesOptions = {}
): Promise<RoyalOSDeveloperFileListResult> {
  const policy =
    options.policy ??
    getRoyalOSDeveloperSecurityPolicy();

  const maximumDepth =
    normalizeMaximumDepth(
      options.maximumDepth
    );

  const maximumFiles =
    normalizeMaximumFiles(
      options.maximumFiles,
      policy
    );

  const requestedPaths =
    options.paths &&
    options.paths.length >
      0
      ? Array.from(
          new Set(
            options.paths
              .map(
                (item) =>
                  item.trim()
              )
              .filter(
                Boolean
              )
          )
        )
      : [
          ".",
        ];

  const state:
    ProjectWalkState = {
      policy,

      maximumDepth,

      maximumFiles,

      files:
        new Map(),

      blockedPaths:
        [],

      warnings:
        [],

      truncated:
        false,
    };

  const tree:
    RoyalOSDeveloperTreeNode[] = [];

  for (
    const requestedPath of
    requestedPaths
  ) {
    if (
      state.files.size >=
      maximumFiles
    ) {
      state.truncated =
        true;

      break;
    }

    const node =
      await walkProjectPath(
        requestedPath,
        0,
        state
      );

    if (
      node &&
      options.includeTree !==
        false
    ) {
      tree.push(
        node
      );
    }
  }

  if (
    state.truncated
  ) {
    state.warnings.push(
      `Orion stopped after reaching the approved limit of ${maximumFiles} files.`
    );
  }

  if (
    state.blockedPaths
      .length > 0
  ) {
    state.warnings.push(
      `${state.blockedPaths.length} project path(s) were excluded by the RoyalOS developer security policy.`
    );
  }

  const files =
    Array.from(
      state.files.values()
    ).sort(
      (
        first,
        second
      ) =>
        first.relativePath.localeCompare(
          second.relativePath,
          undefined,
          {
            sensitivity:
              "base",
          }
        )
    );

  return {
    files,

    tree:
      options.includeTree ===
      false
        ? []
        : tree,

    blockedPaths:
      state.blockedPaths,

    warnings:
      state.warnings,

    truncated:
      state.truncated,
  };
}

/*
 * ============================================================
 * FULL PROJECT INSPECTION
 * ============================================================
 */

export async function inspectRoyalOSDeveloperProject(
  request:
    RoyalOSDeveloperInspectionRequest
): Promise<RoyalOSDeveloperInspectionResult> {
  const startedAt =
    globalThis.performance.now();

  const policy =
    getRoyalOSDeveloperSecurityPolicy();

  const requestId =
    cleanOptionalText(
      request.requestId
    ) ||
    createRequestId();

  const instruction =
    cleanRequiredText(
      request.instruction,
      "Developer inspection instruction"
    );

  const project =
    await getRoyalOSDeveloperProject(
      request.workspace,
      policy
    );

  const listing =
    await listRoyalOSDeveloperFiles({
      paths:
        request.paths,

      maximumDepth:
        request.maximumDepth,

      maximumFiles:
        request.maximumFiles,

      includeTree:
        request.includeTree ??
        true,

      policy,
    });

  const contents:
    RoyalOSDeveloperFileContent[] = [];

  const warnings = [
    ...listing.warnings,
  ];

  if (
    request.includeContents
  ) {
    for (
      const file of
      listing.files
    ) {
      try {
        const content =
          await readRoyalOSDeveloperFile(
            file.relativePath,
            {
              policy,

              includeSha256:
                true,
            }
          );

        contents.push(
          content
        );

        if (
          content.truncated
        ) {
          warnings.push(
            `"${file.relativePath}" was truncated during inspection.`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "RoyalOS could not read this file.";

        listing.blockedPaths.push(
          createBlockedPathEntry(
            file.relativePath,
            message
          )
        );
      }
    }
  }

  const durationMs =
    Math.round(
      globalThis.performance.now() -
        startedAt
    );

  const summaryParts = [
    `Orion inspected ${listing.files.length} approved project file${
      listing.files.length ===
      1
        ? ""
        : "s"
    }.`,

    request.includeContents
      ? `${contents.length} file content record${
          contents.length ===
          1
            ? " was"
            : "s were"
        } loaded for analysis.`
      : "File contents were not loaded during this inspection.",

    listing.blockedPaths
      .length > 0
      ? `${listing.blockedPaths.length} path${
          listing.blockedPaths
            .length === 1
            ? " was"
            : "s were"
        } blocked or skipped for security.`
      : "No requested paths were blocked.",

    `Instruction: ${instruction}`,
  ];

  return {
    requestId,

    status:
      "succeeded",

    project,

    files:
      listing.files,

    contents,

    tree:
      request.includeTree ===
      false
        ? undefined
        : listing.tree,

    blockedPaths:
      listing.blockedPaths,

    summary:
      summaryParts.join(
        " "
      ),

    warnings,

    inspectedAt:
      new Date()
        .toISOString(),

    durationMs,
  };
}

/*
 * ============================================================
 * READ MULTIPLE APPROVED FILES
 * ============================================================
 */

export async function readRoyalOSDeveloperFiles(
  paths:
    string[],
  options:
    ReadRoyalOSDeveloperFileOptions & {
      maximumFiles?: number;
    } = {}
): Promise<{
  contents:
    RoyalOSDeveloperFileContent[];

  blockedPaths:
    Array<{
      path: string;
      reason: string;
    }>;

  warnings:
    string[];
}> {
  const policy =
    options.policy ??
    getRoyalOSDeveloperSecurityPolicy();

  const maximumFiles =
    normalizeMaximumFiles(
      options.maximumFiles,
      policy
    );

  const uniquePaths =
    Array.from(
      new Set(
        paths
          .map(
            (item) =>
              item.trim()
          )
          .filter(
            Boolean
          )
      )
    ).slice(
      0,
      maximumFiles
    );

  const contents:
    RoyalOSDeveloperFileContent[] = [];

  const blockedPaths:
    Array<{
      path: string;
      reason: string;
    }> = [];

  const warnings:
    string[] = [];

  for (
    const requestedPath of
    uniquePaths
  ) {
    try {
      contents.push(
        await readRoyalOSDeveloperFile(
          requestedPath,
          {
            ...options,

            policy,
          }
        )
      );
    } catch (error) {
      blockedPaths.push({
        path:
          normalizeRelativePath(
            requestedPath
          ),

        reason:
          error instanceof Error
            ? error.message
            : "RoyalOS could not read this project file.",
      });
    }
  }

  if (
    paths.length >
    maximumFiles
  ) {
    warnings.push(
      `Only the first ${maximumFiles} approved files were considered because of the RoyalOS inspection limit.`
    );
  }

  if (
    blockedPaths.length >
    0
  ) {
    warnings.push(
      `${blockedPaths.length} file${
        blockedPaths.length ===
        1
          ? " was"
          : "s were"
      } blocked or unavailable.`
    );
  }

  return {
    contents,

    blockedPaths,

    warnings,
  };
}

/*
 * ============================================================
 * SINGLE FILE REFERENCE
 * ============================================================
 */

export async function getRoyalOSDeveloperFileReference(
  requestedPath: string
): Promise<RoyalOSDeveloperFileReference> {
  return createApprovedFileReference(
    requestedPath,
    getRoyalOSDeveloperSecurityPolicy()
  );
}