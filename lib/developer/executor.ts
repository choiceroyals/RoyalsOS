import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  evaluateRoyalOSDeveloperPath,
  evaluateRoyalOSDeveloperPathSecurely,
  getRoyalOSDeveloperSecurityPolicy,
  scanRoyalOSDeveloperContentForSecrets,
} from "@/lib/developer/security";
import {
  appendRoyalOSOrionAudit,
  calculateRoyalOSOrionSha256,
  createRoyalOSOrionTransactionId,
  getRoyalOSOrionBackupRoot,
  loadRoyalOSOrionTransaction,
  markRoyalOSDeveloperProposalApplied,
  saveRoyalOSOrionTransaction,
  verifyRoyalOSDeveloperApproval,
  type RoyalOSOrionBackupEntry,
  type RoyalOSOrionTransactionRecord,
} from "@/lib/developer/local-runtime";
import { runRoyalOSOrionValidationSuite } from "@/lib/developer/validation";
import type {
  RoyalOSDeveloperProposedChange,
  RoyalOSDeveloperSecurityPolicy,
  RoyalOSDeveloperValidationResult,
} from "@/lib/developer/types";

export type RoyalOSOrionExecutionCapabilities = {
  localMode: boolean;
  writesEnabled: boolean;
  deletesEnabled: boolean;
  terminalEnabled: boolean;
  backupsRequired: boolean;
  approvalRequired: boolean;
  packageInstallationEnabled: false;
  deploymentEnabled: false;
  secretsProtected: true;
  projectRoot: string;
};

export type ApplyRoyalOSOrionProposalInput = {
  proposalId: string;
  approvalToken: string;
  approvalText: string;
  approvedBy: string;
  approvalNote?: string;
  validationCommands?: string[];
  autoRollbackOnValidationFailure?: boolean;
};

function truthyEnvironmentValue(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || !value.trim()) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getRoyalOSOrionExecutionCapabilities(): RoyalOSOrionExecutionCapabilities {
  const base = getRoyalOSDeveloperSecurityPolicy();
  const localMode = process.env.NODE_ENV !== "production";
  const writesEnabled = localMode && truthyEnvironmentValue(process.env.ORION_LOCAL_WRITES_ENABLED, true);
  const terminalEnabled = localMode && truthyEnvironmentValue(process.env.ORION_LOCAL_VALIDATION_ENABLED, true);
  const deletesEnabled = writesEnabled && truthyEnvironmentValue(process.env.ORION_LOCAL_DELETES_ENABLED, true);

  return {
    localMode,
    writesEnabled,
    deletesEnabled,
    terminalEnabled,
    backupsRequired: true,
    approvalRequired: true,
    packageInstallationEnabled: false,
    deploymentEnabled: false,
    secretsProtected: true,
    projectRoot: base.projectRoot,
  };
}

function createExecutionPolicy(): RoyalOSDeveloperSecurityPolicy {
  const base = getRoyalOSDeveloperSecurityPolicy();
  const capabilities = getRoyalOSOrionExecutionCapabilities();
  return {
    ...base,
    readOnly: !capabilities.writesEnabled,
    allowWrites: capabilities.writesEnabled,
    allowDeletes: capabilities.deletesEnabled,
    allowTerminal: capabilities.terminalEnabled,
    allowPackageInstallation: false,
    allowDatabaseChanges: false,
    requireApprovalForWrites: true,
    requireBackupBeforeWrites: true,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeFileAtomically(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  await fs.writeFile(temporaryPath, content, "utf8");
  await fs.rename(temporaryPath, filePath);
}

async function createBackup(input: {
  transactionId: string;
  change: RoyalOSDeveloperProposedChange;
  absolutePath: string;
  original: Buffer | null;
}): Promise<RoyalOSOrionBackupEntry> {
  const relativePath = input.change.relativePath.replace(/\\/g, "/");
  const backupRelativePath = input.original
    ? path.join(input.transactionId, "files", relativePath).replace(/\\/g, "/")
    : null;

  if (input.original && backupRelativePath) {
    const absoluteBackupPath = path.join(getRoyalOSOrionBackupRoot(), backupRelativePath);
    await fs.mkdir(path.dirname(absoluteBackupPath), { recursive: true });
    await fs.writeFile(absoluteBackupPath, input.original);
  }

  return {
    changeId: input.change.changeId,
    relativePath,
    backupRelativePath,
    existedBefore: Boolean(input.original),
    originalSha256: input.original ? calculateRoyalOSOrionSha256(input.original) : null,
    appliedSha256: null,
    changeType: input.change.changeType,
  };
}

async function validateChangePath(
  change: RoyalOSDeveloperProposedChange,
  accessLevel: "write" | "delete",
): Promise<{ absolutePath: string; relativePath: string }> {
  const policy = createExecutionPolicy();

  if (change.changeType === "create") {
    const decision = evaluateRoyalOSDeveloperPath(change.relativePath, {
      accessLevel: "write",
      isDirectory: false,
      policy,
    });
    if (!decision.allowed || !decision.absolutePath || !decision.relativePath) {
      throw new Error(`Orion cannot write "${change.relativePath}": ${decision.reason}`);
    }

    const parentRelativePath = path.dirname(decision.relativePath).replace(/\\/g, "/");
    const parentDecision = await evaluateRoyalOSDeveloperPathSecurely(parentRelativePath, {
      accessLevel: "write",
      isDirectory: true,
      policy,
    });
    if (!parentDecision.allowed) {
      throw new Error(`Orion cannot create "${change.relativePath}": ${parentDecision.reason}`);
    }

    return { absolutePath: decision.absolutePath, relativePath: decision.relativePath };
  }

  const decision = await evaluateRoyalOSDeveloperPathSecurely(change.relativePath, {
    accessLevel,
    isDirectory: false,
    policy,
  });
  if (!decision.allowed || !decision.absolutePath || !decision.relativePath) {
    throw new Error(`Orion cannot ${accessLevel} "${change.relativePath}": ${decision.reason}`);
  }
  return { absolutePath: decision.absolutePath, relativePath: decision.relativePath };
}

async function applyOneChange(input: {
  transactionId: string;
  change: RoyalOSDeveloperProposedChange;
}): Promise<RoyalOSOrionBackupEntry> {
  const change = input.change;
  const accessLevel = change.changeType === "delete" ? "delete" : "write";
  const { absolutePath } = await validateChangePath(change, accessLevel);
  const original = await readIfExists(absolutePath);

  if (change.originalSha256 && original) {
    const actualHash = calculateRoyalOSOrionSha256(original);
    if (actualHash !== change.originalSha256) {
      throw new Error(
        `Orion refused to change "${change.relativePath}" because it changed after the proposal was created. Generate a fresh proposal.`,
      );
    }
  }

  if (change.changeType === "create" && original) {
    throw new Error(`Orion expected "${change.relativePath}" to be new, but the file already exists.`);
  }

  if (["replace", "modify", "delete"].includes(change.changeType) && !original) {
    throw new Error(`Orion expected "${change.relativePath}" to exist, but it was not found.`);
  }

  const backup = await createBackup({
    transactionId: input.transactionId,
    change,
    absolutePath,
    original,
  });

  if (change.changeType === "delete") {
    await fs.unlink(absolutePath);
    return backup;
  }

  if (typeof change.proposedContent !== "string") {
    throw new Error(`Orion did not provide complete content for "${change.relativePath}".`);
  }

  const secretFindings = scanRoyalOSDeveloperContentForSecrets(change.proposedContent);
  if (secretFindings.length > 0) {
    throw new Error(
      `Orion refused to write "${change.relativePath}" because the proposed code appears to contain a secret: ${secretFindings
        .map((finding) => finding.description)
        .join(" ")}`,
    );
  }

  await writeFileAtomically(absolutePath, change.proposedContent);
  backup.appliedSha256 = calculateRoyalOSOrionSha256(change.proposedContent);
  return backup;
}

async function restoreBackupEntries(backups: RoyalOSOrionBackupEntry[]): Promise<void> {
  const root = getRoyalOSDeveloperSecurityPolicy().projectRoot;
  for (const backup of [...backups].reverse()) {
    const targetPath = path.resolve(root, backup.relativePath);
    if (backup.existedBefore && backup.backupRelativePath) {
      const backupPath = path.join(getRoyalOSOrionBackupRoot(), backup.backupRelativePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const content = await fs.readFile(backupPath);
      const temporaryPath = `${targetPath}.${process.pid}.${randomUUID()}.rollback.tmp`;
      await fs.writeFile(temporaryPath, content);
      await fs.rename(temporaryPath, targetPath);
    } else if (await fileExists(targetPath)) {
      await fs.unlink(targetPath);
    }
  }
}

function collectValidationCommands(
  proposalCommands: string[],
  changeCommands: string[][],
  requestedCommands: string[] | undefined,
): string[] {
  const requested = requestedCommands?.length ? requestedCommands : proposalCommands;
  return Array.from(new Set([...requested, ...changeCommands.flat()])).filter((command) =>
    ["npx tsc --noEmit", "npm run lint", "npm run build"].includes(command.trim().replace(/\s+/g, " ")),
  );
}

export async function applyRoyalOSOrionProposal(
  input: ApplyRoyalOSOrionProposalInput,
): Promise<RoyalOSOrionTransactionRecord> {
  const capabilities = getRoyalOSOrionExecutionCapabilities();
  if (!capabilities.localMode || !capabilities.writesEnabled) {
    throw new Error(
      "Orion local file writes are disabled. Run RoyalOS in local development mode and enable ORION_LOCAL_WRITES_ENABLED.",
    );
  }

  const stored = await verifyRoyalOSDeveloperApproval({
    proposalId: input.proposalId,
    approvalToken: input.approvalToken,
    approvalText: input.approvalText,
  });

  const transactionId = createRoyalOSOrionTransactionId();
  const startedAt = new Date();
  const transaction: RoyalOSOrionTransactionRecord = {
    transactionId,
    proposalId: stored.proposalId,
    requestId: stored.requestId,
    planId: stored.planId,
    workspace: stored.workspace,
    title: stored.proposal.plan.title,
    status: "applying",
    riskLevel: stored.riskLevel,
    approvedBy: input.approvedBy.trim() || "CEO",
    approvalNote: input.approvalNote?.trim().slice(0, 2_000),
    affectedPaths: stored.proposal.changes.map((change) => change.relativePath),
    appliedChanges: [],
    failedChanges: [],
    backups: [],
    validations: [],
    autoRollbackOnValidationFailure: input.autoRollbackOnValidationFailure !== false,
    rollbackPerformed: false,
    startedAt: startedAt.toISOString(),
  };

  await saveRoyalOSOrionTransaction(transaction);
  await appendRoyalOSOrionAudit({
    eventType: "approval_granted",
    proposalId: stored.proposalId,
    transactionId,
    message: `${transaction.approvedBy} approved Orion proposal ${stored.proposalId}.`,
    details: { affectedPaths: transaction.affectedPaths, riskLevel: transaction.riskLevel },
  });

  try {
    for (const change of stored.proposal.changes) {
      try {
        const backup = await applyOneChange({ transactionId, change });
        transaction.backups.push(backup);
        transaction.appliedChanges.push(change.relativePath);
        await appendRoyalOSOrionAudit({
          eventType: "change_applied",
          proposalId: stored.proposalId,
          transactionId,
          message: `Orion applied ${change.changeType} to ${change.relativePath}.`,
          details: { changeId: change.changeId, changeType: change.changeType },
        });
      } catch (error) {
        transaction.failedChanges.push(change.relativePath);
        throw error;
      }
    }

    const validationCommands = capabilities.terminalEnabled
      ? collectValidationCommands(
          stored.proposal.plan.validationCommands,
          stored.proposal.changes.map((change) => change.validationCommands),
          input.validationCommands,
        )
      : [];

    if (validationCommands.length > 0) {
      await appendRoyalOSOrionAudit({
        eventType: "validation_started",
        proposalId: stored.proposalId,
        transactionId,
        message: `Orion started ${validationCommands.length} approved validation command(s).`,
        details: { commands: validationCommands },
      });
      transaction.validations = await runRoyalOSOrionValidationSuite(validationCommands);
      const validationFailed = transaction.validations.some((result) => result.status !== "passed");

      if (validationFailed) {
        transaction.status = "validation_failed";
        await appendRoyalOSOrionAudit({
          eventType: "validation_failed",
          proposalId: stored.proposalId,
          transactionId,
          message: "One or more Orion validation commands failed.",
          details: { results: transaction.validations.map((item) => ({ command: item.command, status: item.status })) },
        });

        if (transaction.autoRollbackOnValidationFailure) {
          await restoreBackupEntries(transaction.backups);
          transaction.rollbackPerformed = true;
          transaction.status = "rolled_back";
          await appendRoyalOSOrionAudit({
            eventType: "rollback_completed",
            proposalId: stored.proposalId,
            transactionId,
            message: "Orion automatically rolled back the proposal after validation failure.",
          });
        }
      } else {
        await appendRoyalOSOrionAudit({
          eventType: "validation_passed",
          proposalId: stored.proposalId,
          transactionId,
          message: "All approved Orion validation commands passed.",
        });
      }
    }

    if (transaction.status === "applying") transaction.status = "succeeded";
    await markRoyalOSDeveloperProposalApplied(stored.proposalId);
  } catch (error) {
    transaction.error = error instanceof Error ? error.message : "Unknown Orion execution error.";
    transaction.status = "failed";

    if (transaction.backups.length > 0) {
      try {
        await restoreBackupEntries(transaction.backups);
        transaction.rollbackPerformed = true;
        transaction.status = "rolled_back";
      } catch (rollbackError) {
        transaction.error = `${transaction.error} Rollback also failed: ${
          rollbackError instanceof Error ? rollbackError.message : "Unknown rollback error."
        }`;
      }
    }

    await appendRoyalOSOrionAudit({
      eventType: "request_failed",
      proposalId: stored.proposalId,
      transactionId,
      message: transaction.error,
      details: { failedChanges: transaction.failedChanges, rollbackPerformed: transaction.rollbackPerformed },
    });
  }

  const completedAt = new Date();
  transaction.completedAt = completedAt.toISOString();
  transaction.durationMs = completedAt.getTime() - startedAt.getTime();
  await saveRoyalOSOrionTransaction(transaction);
  return transaction;
}

export async function rollbackRoyalOSOrionTransaction(input: {
  transactionId: string;
  approvalText: string;
  approvedBy: string;
}): Promise<RoyalOSOrionTransactionRecord> {
  if (input.approvalText.trim().toUpperCase() !== "ROLLBACK") {
    throw new Error('Type "ROLLBACK" exactly to restore the project backup.');
  }

  const transaction = await loadRoyalOSOrionTransaction(input.transactionId);
  if (transaction.rollbackPerformed || transaction.status === "rolled_back") return transaction;
  if (transaction.backups.length === 0) throw new Error("This Orion transaction has no backup entries to restore.");

  await appendRoyalOSOrionAudit({
    eventType: "rollback_started",
    proposalId: transaction.proposalId,
    transactionId: transaction.transactionId,
    message: `${input.approvedBy.trim() || "CEO"} approved rollback of ${transaction.transactionId}.`,
  });

  await restoreBackupEntries(transaction.backups);
  transaction.rollbackPerformed = true;
  transaction.status = "rolled_back";
  transaction.completedAt = new Date().toISOString();
  await saveRoyalOSOrionTransaction(transaction);
  await appendRoyalOSOrionAudit({
    eventType: "rollback_completed",
    proposalId: transaction.proposalId,
    transactionId: transaction.transactionId,
    message: `Orion restored all backup entries for ${transaction.transactionId}.`,
  });
  return transaction;
}

export async function validateRoyalOSOrionProject(
  commands: string[],
): Promise<RoyalOSDeveloperValidationResult[]> {
  const capabilities = getRoyalOSOrionExecutionCapabilities();
  if (!capabilities.terminalEnabled) {
    throw new Error("Orion local validation commands are disabled.");
  }
  return runRoyalOSOrionValidationSuite(commands);
}
