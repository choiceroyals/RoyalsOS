import type {
  RoyalOSEmployeeName,
  RoyalOSJsonObject,
  RoyalOSJsonValue,
  RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * DEVELOPER EMPLOYEES
 * ============================================================
 */

export const ROYALOS_DEVELOPER_EMPLOYEES = [
  "Orion",
  "Atlas",
  "Nova",
  "Titan",
  "Adedeji",
] as const satisfies readonly RoyalOSEmployeeName[];

export type RoyalOSDeveloperEmployee =
  (typeof ROYALOS_DEVELOPER_EMPLOYEES)[number];

/*
 * ============================================================
 * DEVELOPER WORKBENCH MODES
 * ============================================================
 */

export const ROYALOS_DEVELOPER_MODES = [
  "inspect",
  "search",
  "plan",
  "propose",
  "apply",
  "validate",
  "rollback",
] as const;

export type RoyalOSDeveloperMode =
  (typeof ROYALOS_DEVELOPER_MODES)[number];

/*
 * ============================================================
 * DEVELOPER REQUEST STATUS
 * ============================================================
 */

export const ROYALOS_DEVELOPER_REQUEST_STATUSES = [
  "requested",
  "validating",
  "reading",
  "analyzing",
  "planning",
  "awaiting_approval",
  "approved",
  "applying",
  "testing",
  "succeeded",
  "failed",
  "rejected",
  "cancelled",
  "rolled_back",
] as const;

export type RoyalOSDeveloperRequestStatus =
  (typeof ROYALOS_DEVELOPER_REQUEST_STATUSES)[number];

/*
 * ============================================================
 * RISK LEVELS
 * ============================================================
 */

export const ROYALOS_DEVELOPER_RISK_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type RoyalOSDeveloperRiskLevel =
  (typeof ROYALOS_DEVELOPER_RISK_LEVELS)[number];

/*
 * ============================================================
 * FILE ACCESS LEVELS
 * ============================================================
 */

export const ROYALOS_DEVELOPER_ACCESS_LEVELS = [
  "none",
  "read",
  "propose",
  "write",
  "delete",
] as const;

export type RoyalOSDeveloperAccessLevel =
  (typeof ROYALOS_DEVELOPER_ACCESS_LEVELS)[number];

/*
 * ============================================================
 * FILE CATEGORIES
 * ============================================================
 */

export const ROYALOS_DEVELOPER_FILE_CATEGORIES = [
  "source",
  "configuration",
  "documentation",
  "stylesheet",
  "data",
  "asset",
  "generated",
  "dependency",
  "secret",
  "system",
  "unknown",
] as const;

export type RoyalOSDeveloperFileCategory =
  (typeof ROYALOS_DEVELOPER_FILE_CATEGORIES)[number];

/*
 * ============================================================
 * SUPPORTED SOURCE LANGUAGES
 * ============================================================
 */

export const ROYALOS_DEVELOPER_LANGUAGES = [
  "typescript",
  "typescript-react",
  "javascript",
  "javascript-react",
  "json",
  "css",
  "scss",
  "html",
  "markdown",
  "sql",
  "shell",
  "powershell",
  "python",
  "php",
  "xml",
  "yaml",
  "text",
  "unknown",
] as const;

export type RoyalOSDeveloperLanguage =
  (typeof ROYALOS_DEVELOPER_LANGUAGES)[number];

/*
 * ============================================================
 * PROJECT INFORMATION
 * ============================================================
 */

export type RoyalOSDeveloperProject = {
  name: string;

  rootPath: string;

  workspace:
    RoyalOSWorkspace;

  framework?: string;

  packageManager?:
    | "npm"
    | "pnpm"
    | "yarn"
    | "bun"
    | "unknown";

  readOnly:
    boolean;

  createdAt:
    string;

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * FILE INFORMATION
 * ============================================================
 */

export type RoyalOSDeveloperFileReference = {
  relativePath: string;

  fileName: string;

  extension: string;

  language:
    RoyalOSDeveloperLanguage;

  category:
    RoyalOSDeveloperFileCategory;

  sizeBytes:
    number;

  lineCount:
    number | null;

  lastModifiedAt:
    string | null;

  accessLevel:
    RoyalOSDeveloperAccessLevel;

  readable:
    boolean;

  writable:
    boolean;

  blockedReason?:
    string;
};

export type RoyalOSDeveloperFileContent = {
  file:
    RoyalOSDeveloperFileReference;

  content:
    string;

  truncated:
    boolean;

  totalCharacters:
    number;

  returnedCharacters:
    number;

  sha256?:
    string;

  loadedAt:
    string;
};

/*
 * ============================================================
 * DIRECTORY TREE
 * ============================================================
 */

export type RoyalOSDeveloperTreeNode = {
  name: string;

  relativePath: string;

  type:
    | "file"
    | "directory";

  category:
    RoyalOSDeveloperFileCategory;

  blocked:
    boolean;

  blockedReason?:
    string;

  children?:
    RoyalOSDeveloperTreeNode[];
};

/*
 * ============================================================
 * SECURITY POLICY
 * ============================================================
 */

export type RoyalOSDeveloperSecurityPolicy = {
  projectRoot:
    string;

  readOnly:
    boolean;

  allowedExtensions:
    string[];

  blockedFileNames:
    string[];

  blockedDirectoryNames:
    string[];

  blockedPathFragments:
    string[];

  maximumFileBytes:
    number;

  maximumReadCharacters:
    number;

  maximumFilesPerRequest:
    number;

  allowHiddenFiles:
    boolean;

  allowPackageFiles:
    boolean;

  allowLockFiles:
    boolean;

  allowUploads:
    boolean;

  allowTerminal:
    boolean;

  allowWrites:
    boolean;

  allowDeletes:
    boolean;

  allowPackageInstallation:
    boolean;

  allowDatabaseChanges:
    boolean;

  requireApprovalForWrites:
    boolean;

  requireBackupBeforeWrites:
    boolean;
};

export type RoyalOSDeveloperPathDecision = {
  allowed:
    boolean;

  accessLevel:
    RoyalOSDeveloperAccessLevel;

  relativePath:
    string | null;

  absolutePath:
    string | null;

  category:
    RoyalOSDeveloperFileCategory;

  reason:
    string;

  matchedRule?:
    string;
};

/*
 * ============================================================
 * INSPECTION
 * ============================================================
 */

export type RoyalOSDeveloperInspectionRequest = {
  requestId:
    string;

  instruction:
    string;

  employee:
    RoyalOSDeveloperEmployee;

  workspace:
    RoyalOSWorkspace;

  paths?:
    string[];

  includeTree?:
    boolean;

  includeContents?:
    boolean;

  maximumDepth?:
    number;

  maximumFiles?:
    number;

  metadata?:
    RoyalOSJsonObject;
};

export type RoyalOSDeveloperInspectionResult = {
  requestId:
    string;

  status:
    RoyalOSDeveloperRequestStatus;

  project:
    RoyalOSDeveloperProject;

  files:
    RoyalOSDeveloperFileReference[];

  contents:
    RoyalOSDeveloperFileContent[];

  tree?:
    RoyalOSDeveloperTreeNode[];

  blockedPaths:
    Array<{
      path: string;
      reason: string;
    }>;

  summary:
    string;

  warnings:
    string[];

  inspectedAt:
    string;

  durationMs:
    number;
};

/*
 * ============================================================
 * CODE SEARCH
 * ============================================================
 */

export type RoyalOSDeveloperSearchRequest = {
  requestId:
    string;

  query:
    string;

  employee:
    RoyalOSDeveloperEmployee;

  workspace:
    RoyalOSWorkspace;

  paths?:
    string[];

  extensions?:
    string[];

  caseSensitive?:
    boolean;

  useRegularExpression?:
    boolean;

  maximumResults?:
    number;

  contextLines?:
    number;

  metadata?:
    RoyalOSJsonObject;
};

export type RoyalOSDeveloperSearchMatch = {
  relativePath:
    string;

  lineNumber:
    number;

  columnNumber:
    number;

  line:
    string;

  before:
    string[];

  after:
    string[];

  match:
    string;

  language:
    RoyalOSDeveloperLanguage;
};

export type RoyalOSDeveloperSearchResult = {
  requestId:
    string;

  query:
    string;

  status:
    RoyalOSDeveloperRequestStatus;

  matches:
    RoyalOSDeveloperSearchMatch[];

  searchedFiles:
    number;

  skippedFiles:
    number;

  truncated:
    boolean;

  warnings:
    string[];

  searchedAt:
    string;

  durationMs:
    number;
};

/*
 * ============================================================
 * DEVELOPMENT PLAN
 * ============================================================
 */

export type RoyalOSDeveloperPlanStep = {
  stepNumber:
    number;

  title:
    string;

  description:
    string;

  employee:
    RoyalOSDeveloperEmployee;

  affectedPaths:
    string[];

  riskLevel:
    RoyalOSDeveloperRiskLevel;

  requiresCEOApproval:
    boolean;

  validationCommands:
    string[];

  rollbackInstructions?:
    string;

  dependencies?:
    number[];
};

export type RoyalOSDeveloperPlan = {
  planId:
    string;

  requestId:
    string;

  title:
    string;

  objective:
    string;

  summary:
    string;

  primaryEmployee:
    RoyalOSDeveloperEmployee;

  supportingEmployees:
    RoyalOSDeveloperEmployee[];

  workspace:
    RoyalOSWorkspace;

  status:
    RoyalOSDeveloperRequestStatus;

  riskLevel:
    RoyalOSDeveloperRiskLevel;

  requiresCEOApproval:
    boolean;

  affectedPaths:
    string[];

  steps:
    RoyalOSDeveloperPlanStep[];

  assumptions:
    string[];

  risks:
    string[];

  validationCommands:
    string[];

  rollbackPlan:
    string[];

  createdAt:
    string;

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * PROPOSED FILE CHANGES
 * ============================================================
 */

export const ROYALOS_DEVELOPER_CHANGE_TYPES = [
  "create",
  "replace",
  "modify",
  "rename",
  "delete",
] as const;

export type RoyalOSDeveloperChangeType =
  (typeof ROYALOS_DEVELOPER_CHANGE_TYPES)[number];

export type RoyalOSDeveloperTextRange = {
  startLine:
    number;

  startColumn:
    number;

  endLine:
    number;

  endColumn:
    number;
};

export type RoyalOSDeveloperProposedChange = {
  changeId:
    string;

  planId:
    string;

  relativePath:
    string;

  changeType:
    RoyalOSDeveloperChangeType;

  riskLevel:
    RoyalOSDeveloperRiskLevel;

  requiresCEOApproval:
    boolean;

  summary:
    string;

  reason:
    string;

  originalContent?:
    string;

  proposedContent?:
    string;

  originalSha256?:
    string;

  targetRange?:
    RoyalOSDeveloperTextRange;

  backupRequired:
    boolean;

  validationCommands:
    string[];

  rollbackInstructions:
    string[];
};

/*
 * ============================================================
 * CODE DIFF
 * ============================================================
 */

export type RoyalOSDeveloperDiffLine = {
  type:
    | "context"
    | "addition"
    | "deletion";

  oldLineNumber:
    number | null;

  newLineNumber:
    number | null;

  content:
    string;
};

export type RoyalOSDeveloperDiffHunk = {
  oldStart:
    number;

  oldLines:
    number;

  newStart:
    number;

  newLines:
    number;

  lines:
    RoyalOSDeveloperDiffLine[];
};

export type RoyalOSDeveloperFileDiff = {
  relativePath:
    string;

  changeType:
    RoyalOSDeveloperChangeType;

  additions:
    number;

  deletions:
    number;

  hunks:
    RoyalOSDeveloperDiffHunk[];

  generatedAt:
    string;
};

/*
 * ============================================================
 * CEO APPROVAL
 * ============================================================
 */

export const ROYALOS_DEVELOPER_APPROVAL_DECISIONS = [
  "approved",
  "rejected",
  "revision_requested",
] as const;

export type RoyalOSDeveloperApprovalDecision =
  (typeof ROYALOS_DEVELOPER_APPROVAL_DECISIONS)[number];

export type RoyalOSDeveloperApprovalRequest = {
  approvalId:
    string;

  requestId:
    string;

  planId?:
    string;

  changeIds:
    string[];

  summary:
    string;

  riskLevel:
    RoyalOSDeveloperRiskLevel;

  affectedPaths:
    string[];

  requestedBy:
    RoyalOSDeveloperEmployee;

  requestedAt:
    string;

  expiresAt?:
    string;

  status:
    | "pending"
    | RoyalOSDeveloperApprovalDecision;
};

export type RoyalOSDeveloperApprovalResponse = {
  approvalId:
    string;

  decision:
    RoyalOSDeveloperApprovalDecision;

  decidedBy:
    string;

  note?:
    string;

  decidedAt:
    string;
};

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

export type RoyalOSDeveloperValidationCommand = {
  command:
    string;

  allowed:
    boolean;

  reason:
    string;

  timeoutMs:
    number;
};

export type RoyalOSDeveloperValidationResult = {
  command:
    string;

  status:
    | "passed"
    | "failed"
    | "timed_out"
    | "blocked";

  exitCode:
    number | null;

  stdout:
    string;

  stderr:
    string;

  startedAt:
    string;

  completedAt:
    string;

  durationMs:
    number;
};

/*
 * ============================================================
 * APPLY AND ROLLBACK
 * ============================================================
 */

export type RoyalOSDeveloperBackupRecord = {
  backupId:
    string;

  requestId:
    string;

  changeId:
    string;

  originalRelativePath:
    string;

  backupRelativePath:
    string;

  originalSha256:
    string;

  createdAt:
    string;
};

export type RoyalOSDeveloperApplyResult = {
  requestId:
    string;

  planId:
    string;

  status:
    RoyalOSDeveloperRequestStatus;

  appliedChanges:
    string[];

  failedChanges:
    string[];

  backups:
    RoyalOSDeveloperBackupRecord[];

  validations:
    RoyalOSDeveloperValidationResult[];

  rollbackPerformed:
    boolean;

  error?:
    string;

  startedAt:
    string;

  completedAt:
    string;

  durationMs:
    number;
};

/*
 * ============================================================
 * DEVELOPER RESPONSE
 * ============================================================
 */

export type RoyalOSDeveloperResponse = {
  requestId:
    string;

  employee:
    RoyalOSDeveloperEmployee;

  mode:
    RoyalOSDeveloperMode;

  status:
    RoyalOSDeveloperRequestStatus;

  message:
    string;

  inspection?:
    RoyalOSDeveloperInspectionResult;

  search?:
    RoyalOSDeveloperSearchResult;

  plan?:
    RoyalOSDeveloperPlan;

  changes?:
    RoyalOSDeveloperProposedChange[];

  diffs?:
    RoyalOSDeveloperFileDiff[];

  approval?:
    RoyalOSDeveloperApprovalRequest;

  applyResult?:
    RoyalOSDeveloperApplyResult;

  warnings:
    string[];

  createdAt:
    string;

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * DEVELOPER AUDIT EVENT
 * ============================================================
 */

export const ROYALOS_DEVELOPER_AUDIT_EVENTS = [
  "request_received",
  "security_checked",
  "project_inspected",
  "code_searched",
  "plan_created",
  "change_proposed",
  "approval_requested",
  "approval_granted",
  "approval_rejected",
  "change_applied",
  "validation_started",
  "validation_passed",
  "validation_failed",
  "rollback_started",
  "rollback_completed",
  "request_failed",
] as const;

export type RoyalOSDeveloperAuditEventType =
  (typeof ROYALOS_DEVELOPER_AUDIT_EVENTS)[number];

export type RoyalOSDeveloperAuditEvent = {
  eventId:
    string;

  eventType:
    RoyalOSDeveloperAuditEventType;

  requestId:
    string;

  planId?:
    string;

  changeId?:
    string;

  employee:
    RoyalOSDeveloperEmployee;

  workspace:
    RoyalOSWorkspace;

  message:
    string;

  details?:
    RoyalOSJsonObject;

  timestamp:
    string;
};

/*
 * ============================================================
 * GENERAL RESULT
 * ============================================================
 */

export type RoyalOSDeveloperOperationResult<
  TValue extends
    RoyalOSJsonValue =
      RoyalOSJsonValue,
> = {
  success:
    boolean;

  value?:
    TValue;

  error?:
    string;

  errorCode?:
    string;

  warnings?:
    string[];

  metadata?:
    RoyalOSJsonObject;
};

/*
 * ============================================================
 * VALIDATION HELPERS
 * ============================================================
 */

export function isRoyalOSDeveloperEmployee(
  value: unknown
): value is RoyalOSDeveloperEmployee {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_EMPLOYEES.includes(
      value as RoyalOSDeveloperEmployee
    )
  );
}

export function isRoyalOSDeveloperMode(
  value: unknown
): value is RoyalOSDeveloperMode {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_MODES.includes(
      value as RoyalOSDeveloperMode
    )
  );
}

export function isRoyalOSDeveloperRequestStatus(
  value: unknown
): value is RoyalOSDeveloperRequestStatus {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_REQUEST_STATUSES.includes(
      value as RoyalOSDeveloperRequestStatus
    )
  );
}

export function isRoyalOSDeveloperRiskLevel(
  value: unknown
): value is RoyalOSDeveloperRiskLevel {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_RISK_LEVELS.includes(
      value as RoyalOSDeveloperRiskLevel
    )
  );
}

export function isRoyalOSDeveloperAccessLevel(
  value: unknown
): value is RoyalOSDeveloperAccessLevel {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_ACCESS_LEVELS.includes(
      value as RoyalOSDeveloperAccessLevel
    )
  );
}

export function isRoyalOSDeveloperLanguage(
  value: unknown
): value is RoyalOSDeveloperLanguage {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_LANGUAGES.includes(
      value as RoyalOSDeveloperLanguage
    )
  );
}

export function isRoyalOSDeveloperChangeType(
  value: unknown
): value is RoyalOSDeveloperChangeType {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_CHANGE_TYPES.includes(
      value as RoyalOSDeveloperChangeType
    )
  );
}

export function isRoyalOSDeveloperApprovalDecision(
  value: unknown
): value is RoyalOSDeveloperApprovalDecision {
  return (
    typeof value === "string" &&
    ROYALOS_DEVELOPER_APPROVAL_DECISIONS.includes(
      value as RoyalOSDeveloperApprovalDecision
    )
  );
}