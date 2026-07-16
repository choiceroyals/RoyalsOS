export type RoyalOSPluginPermission =
  | "assets:read"
  | "assets:write"
  | "messages:read"
  | "messages:write"
  | "missions:read"
  | "missions:write"
  | "knowledge:read"
  | "knowledge:write"
  | "memory:read"
  | "memory:write"
  | "records:read"
  | "records:write"
  | "security:read"
  | "security:write"
  | "integrations:read"
  | "integrations:write"
  | "network:https"
  | "scheduler:jobs";

export type RoyalOSPluginAction = {
  id: string;
  label: string;
  description?: string;
  kind: "webhook" | "open_url" | "workflow" | "report";
  method?: "GET" | "POST";
  url?: string;
  requiredEnvironment?: string[];
  approvalRequired?: boolean;
  employee?: string;
  promptTemplate?: string;
  authEnvironment?: string;
  timeoutSeconds?: number;
};

export type RoyalOSPluginManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  category:
    | "Security"
    | "Authentication"
    | "Bookkeeping"
    | "Media"
    | "Publishing"
    | "Productivity"
    | "Customer Service"
    | "Developer"
    | "Other";
  royalosVersion: string;
  permissions: RoyalOSPluginPermission[];
  capabilities: string[];
  assignedEmployees?: string[];
  requiredEnvironment?: string[];
  actions?: RoyalOSPluginAction[];
  tags?: string[];
};

export type InstalledRoyalOSPlugin = {
  manifest: RoyalOSPluginManifest;
  enabled: boolean;
  source: "marketplace" | "upload";
  installedAt: string;
  updatedAt: string;
  packagePath?: string;
  checksum?: string;
  lastHealthCheck?: {
    status: "healthy" | "setup_required" | "disabled" | "error";
    message: string;
    checkedAt: string;
  };
};
