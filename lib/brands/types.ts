import type { RoyalOSEmployeeName } from "@/lib/employees/config";

export type BrandStatus = "active" | "paused" | "setup";
export type BrandConnectionState =
  | "connected"
  | "credentials_ready"
  | "setup_required"
  | "expiring"
  | "error"
  | "disconnected";

export type BrandProfile = {
  id: string;
  name: string;
  legalName?: string;
  slug: string;
  description: string;
  logoUrl: string;
  compactLogoUrl?: string;
  primaryDomain?: string;
  accentColor: string;
  accentSoft: string;
  workspaceId: string;
  status: BrandStatus;
  category: string;
  missionStatement: string;
};

export type BrandWebsite = {
  id: string;
  brandId: string;
  label: string;
  url: string;
  kind: "main" | "shop" | "community" | "academy" | "blog" | "admin" | "api";
  provider: string;
  health: "healthy" | "warning" | "offline" | "not_checked";
  sslStatus: "valid" | "expiring" | "invalid" | "not_checked";
  lastCheckedAt?: string;
  assignedEmployees: RoyalOSEmployeeName[];
};

export type BrandConnection = {
  id: string;
  brandId: string;
  providerId: string;
  providerName: string;
  accountName?: string;
  externalAccountId?: string;
  status: BrandConnectionState;
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  permissions: string[];
  assignedEmployees: RoyalOSEmployeeName[];
  lastAction?: string;
  lastError?: string;
  requiredEnvironmentVariables: string[];
  missingEnvironmentVariables: string[];
  callbackPath?: string;
};

export type BrandEmployeeAssignment = {
  id: string;
  brandId: string;
  employee: RoyalOSEmployeeName;
  responsibility: string;
  platformIds: string[];
  canDraft: boolean;
  canSchedule: boolean;
  canPublish: boolean;
  publishRequiresApproval: boolean;
  canReadAnalytics: boolean;
};

export type BrandPublishingJob = {
  id: string;
  brandId: string;
  title: string;
  platformIds: string[];
  contentType: string;
  caption: string;
  createdBy: RoyalOSEmployeeName;
  approvalStatus: "draft" | "awaiting_approval" | "approved" | "changes_requested";
  publishStatus: "not_ready" | "ready" | "scheduled" | "published" | "failed";
  scheduledFor?: string;
  platformPostIds?: Record<string, string>;
  error?: string;
  sourceProjectId?: string;
  approvalId?: string;
  assetUrl?: string;
  mediaStatus?: "awaiting_media" | "media_ready";
  updatedAt: string;
};

export type BrandConnectionEvent = {
  id: string;
  brandId: string;
  providerId?: string;
  action: string;
  actor: string;
  result: "success" | "warning" | "error" | "information";
  detail: string;
  createdAt: string;
};

export type BrandOperationsState = {
  version: 1;
  selectedBrandId: string;
  brands: BrandProfile[];
  websites: BrandWebsite[];
  connections: BrandConnection[];
  assignments: BrandEmployeeAssignment[];
  publishingJobs: BrandPublishingJob[];
  events: BrandConnectionEvent[];
  updatedAt: string;
};
