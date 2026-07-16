import { z } from "zod";

const permission = z.enum([
  "assets:read", "assets:write", "messages:read", "messages:write",
  "missions:read", "missions:write", "knowledge:read", "knowledge:write",
  "memory:read", "memory:write", "records:read", "records:write",
  "security:read", "security:write", "integrations:read", "integrations:write",
  "network:https", "scheduler:jobs",
]);

const action = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,79}$/),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  kind: z.enum(["webhook", "open_url", "workflow", "report"]),
  method: z.enum(["GET", "POST"]).optional(),
  url: z.string().url().refine((url) => url.startsWith("https://"), "Only HTTPS URLs are allowed.").optional(),
  requiredEnvironment: z.array(z.string().regex(/^[A-Z][A-Z0-9_]{1,99}$/)).max(30).optional(),
  approvalRequired: z.boolean().optional(),
  employee: z.string().min(1).max(80).optional(),
  promptTemplate: z.string().min(3).max(4000).optional(),
  authEnvironment: z.string().regex(/^[A-Z][A-Z0-9_]{1,99}$/).optional(),
  timeoutSeconds: z.number().int().min(1).max(120).optional(),
}).superRefine((value, context) => {
  if (value.kind === "webhook" && !value.url) {
    context.addIssue({ code: "custom", message: "Webhook actions require an HTTPS URL.", path: ["url"] });
  }
  if ((value.kind === "workflow" || value.kind === "report") && !value.promptTemplate) {
    context.addIssue({ code: "custom", message: "Workflow and report actions require a promptTemplate.", path: ["promptTemplate"] });
  }
});

export const royalOSPluginManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{2,99}$/),
  name: z.string().min(2).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/),
  description: z.string().min(10).max(1200),
  author: z.string().min(2).max(100),
  homepage: z.string().url().optional(),
  category: z.enum(["Security", "Authentication", "Bookkeeping", "Media", "Publishing", "Productivity", "Customer Service", "Developer", "Other"]),
  royalosVersion: z.string().min(1).max(100),
  permissions: z.array(permission).max(40),
  capabilities: z.array(z.string().min(2).max(100)).max(100),
  assignedEmployees: z.array(z.string().min(1).max(80)).max(50).optional(),
  requiredEnvironment: z.array(z.string().regex(/^[A-Z][A-Z0-9_]{1,99}$/)).max(50).optional(),
  actions: z.array(action).max(50).optional(),
  tags: z.array(z.string().min(1).max(40)).max(30).optional(),
}).strict();
