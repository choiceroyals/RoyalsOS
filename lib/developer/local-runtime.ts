import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { getRoyalOSDeveloperSecurityPolicy } from "@/lib/developer/security";
import type { RoyalOSDeveloperProposalResult } from "@/lib/developer/proposer";
import type {
  RoyalOSDeveloperValidationResult,
  RoyalOSDeveloperRiskLevel,
} from "@/lib/developer/types";
import type { RoyalOSWorkspace } from "@/lib/missions/types";

const STATE_DIRECTORY = ".royalos-orion";
const BACKUP_DIRECTORY = ".royalos-backups";
const PROPOSAL_TTL_MS = 6 * 60 * 60 * 1000;

export type RoyalOSOrionStoredProposal = {
  proposalId: string;
  requestId: string;
  planId: string;
  workspace: RoyalOSWorkspace;
  riskLevel: RoyalOSDeveloperRiskLevel;
  approvalId: string;
  approvalTokenHash: string;
  proposalHash: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "applied" | "expired" | "rejected";
  proposal: RoyalOSDeveloperProposalResult;
};

export type RoyalOSOrionBackupEntry = {
  changeId: string;
  relativePath: string;
  backupRelativePath: string | null;
  existedBefore: boolean;
  originalSha256: string | null;
  appliedSha256: string | null;
  changeType: string;
};

export type RoyalOSOrionTransactionRecord = {
  transactionId: string;
  proposalId: string;
  requestId: string;
  planId: string;
  workspace: RoyalOSWorkspace;
  title: string;
  status:
    | "applying"
    | "succeeded"
    | "failed"
    | "rolled_back"
    | "validation_failed";
  riskLevel: RoyalOSDeveloperRiskLevel;
  approvedBy: string;
  approvalNote?: string;
  affectedPaths: string[];
  appliedChanges: string[];
  failedChanges: string[];
  backups: RoyalOSOrionBackupEntry[];
  validations: RoyalOSDeveloperValidationResult[];
  autoRollbackOnValidationFailure: boolean;
  rollbackPerformed: boolean;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
};

export type RoyalOSOrionAuditRecord = {
  eventId: string;
  eventType: string;
  proposalId?: string;
  transactionId?: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function getProjectRoot(): string {
  return getRoyalOSDeveloperSecurityPolicy().projectRoot;
}

function getStateRoot(): string {
  return path.join(getProjectRoot(), STATE_DIRECTORY);
}

export function getRoyalOSOrionBackupRoot(): string {
  return path.join(getProjectRoot(), BACKUP_DIRECTORY);
}

function getProposalDirectory(): string {
  return path.join(getStateRoot(), "proposals");
}

function getTransactionDirectory(): string {
  return path.join(getStateRoot(), "transactions");
}

function getAuditPath(): string {
  return path.join(getStateRoot(), "audit.jsonl");
}

async function ensureRuntimeDirectories(): Promise<void> {
  await Promise.all([
    fs.mkdir(getProposalDirectory(), { recursive: true }),
    fs.mkdir(getTransactionDirectory(), { recursive: true }),
    fs.mkdir(getRoyalOSOrionBackupRoot(), { recursive: true }),
  ]);
}

function proposalFilePath(proposalId: string): string {
  return path.join(getProposalDirectory(), `${proposalId}.json`);
}

function transactionFilePath(transactionId: string): string {
  return path.join(getTransactionDirectory(), `${transactionId}.json`);
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}

export async function appendRoyalOSOrionAudit(
  record: Omit<RoyalOSOrionAuditRecord, "eventId" | "timestamp">,
): Promise<void> {
  await ensureRuntimeDirectories();
  const event: RoyalOSOrionAuditRecord = {
    ...record,
    eventId: `orion_audit_${randomUUID()}`,
    timestamp: new Date().toISOString(),
  };
  await fs.appendFile(getAuditPath(), `${JSON.stringify(event)}\n`, "utf8");
}

export async function registerRoyalOSDeveloperProposal(
  proposal: RoyalOSDeveloperProposalResult,
): Promise<{
  approvalId: string;
  approvalToken: string;
  expiresAt: string;
}> {
  await ensureRuntimeDirectories();

  const approvalId = `orion_approval_${randomUUID()}`;
  const approvalToken = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + PROPOSAL_TTL_MS).toISOString();
  const serializedProposal = JSON.stringify(proposal);

  const stored: RoyalOSOrionStoredProposal = {
    proposalId: proposal.proposalId,
    requestId: proposal.requestId,
    planId: proposal.plan.planId,
    workspace: proposal.plan.workspace,
    riskLevel: proposal.plan.riskLevel,
    approvalId,
    approvalTokenHash: hash(approvalToken),
    proposalHash: hash(serializedProposal),
    createdAt: createdAt.toISOString(),
    expiresAt,
    status: "pending",
    proposal,
  };

  await writeJsonAtomic(proposalFilePath(proposal.proposalId), stored);
  await appendRoyalOSOrionAudit({
    eventType: "approval_requested",
    proposalId: proposal.proposalId,
    message: `Orion prepared proposal ${proposal.proposalId} and requested CEO approval.`,
    details: {
      approvalId,
      affectedPaths: proposal.plan.affectedPaths,
      riskLevel: proposal.plan.riskLevel,
      expiresAt,
    },
  });

  return { approvalId, approvalToken, expiresAt };
}

export async function loadRoyalOSDeveloperProposal(
  proposalId: string,
): Promise<RoyalOSOrionStoredProposal> {
  await ensureRuntimeDirectories();
  const raw = await fs.readFile(proposalFilePath(proposalId), "utf8");
  const stored = JSON.parse(raw) as RoyalOSOrionStoredProposal;

  if (new Date(stored.expiresAt).getTime() < Date.now() && stored.status === "pending") {
    stored.status = "expired";
    await writeJsonAtomic(proposalFilePath(proposalId), stored);
  }

  return stored;
}

export async function verifyRoyalOSDeveloperApproval(input: {
  proposalId: string;
  approvalToken: string;
  approvalText: string;
}): Promise<RoyalOSOrionStoredProposal> {
  if (input.approvalText.trim().toUpperCase() !== "APPROVE") {
    throw new Error('Type "APPROVE" exactly to authorize Orion to change project files.');
  }

  const stored = await loadRoyalOSDeveloperProposal(input.proposalId);

  if (stored.status !== "pending") {
    throw new Error(`Proposal ${input.proposalId} is ${stored.status} and cannot be applied.`);
  }

  if (new Date(stored.expiresAt).getTime() < Date.now()) {
    throw new Error("This Orion approval has expired. Generate a fresh proposal.");
  }

  if (hash(input.approvalToken) !== stored.approvalTokenHash) {
    throw new Error("The Orion approval token is invalid. Generate a fresh proposal.");
  }

  if (hash(JSON.stringify(stored.proposal)) !== stored.proposalHash) {
    throw new Error("The stored Orion proposal failed its integrity check.");
  }

  return stored;
}

export async function markRoyalOSDeveloperProposalApplied(proposalId: string): Promise<void> {
  const stored = await loadRoyalOSDeveloperProposal(proposalId);
  stored.status = "applied";
  await writeJsonAtomic(proposalFilePath(proposalId), stored);
}

export async function saveRoyalOSOrionTransaction(
  transaction: RoyalOSOrionTransactionRecord,
): Promise<void> {
  await ensureRuntimeDirectories();
  await writeJsonAtomic(transactionFilePath(transaction.transactionId), transaction);
}

export async function loadRoyalOSOrionTransaction(
  transactionId: string,
): Promise<RoyalOSOrionTransactionRecord> {
  await ensureRuntimeDirectories();
  const raw = await fs.readFile(transactionFilePath(transactionId), "utf8");
  return JSON.parse(raw) as RoyalOSOrionTransactionRecord;
}

export async function listRoyalOSOrionTransactions(limit = 30): Promise<RoyalOSOrionTransactionRecord[]> {
  await ensureRuntimeDirectories();
  const names = await fs.readdir(getTransactionDirectory());
  const records: RoyalOSOrionTransactionRecord[] = [];

  for (const name of names.filter((entry) => entry.endsWith(".json"))) {
    try {
      const raw = await fs.readFile(path.join(getTransactionDirectory(), name), "utf8");
      records.push(JSON.parse(raw) as RoyalOSOrionTransactionRecord);
    } catch {
      // Ignore an incomplete runtime file and continue showing healthy history.
    }
  }

  return records
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, Math.max(1, Math.min(limit, 100)));
}

export async function listRoyalOSOrionAudit(limit = 100): Promise<RoyalOSOrionAuditRecord[]> {
  await ensureRuntimeDirectories();
  try {
    const raw = await fs.readFile(getAuditPath(), "utf8");
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(limit, 500)))
      .reverse()
      .map((line) => JSON.parse(line) as RoyalOSOrionAuditRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function createRoyalOSOrionTransactionId(): string {
  return `orion_tx_${randomUUID()}`;
}

export function calculateRoyalOSOrionSha256(value: string | Buffer): string {
  return hash(value);
}
