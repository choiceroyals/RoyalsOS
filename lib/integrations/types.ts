import type {
  RoyalOSIntegrationCategory,
  RoyalOSIntegrationId,
  RoyalOSIntegrationStatus,
} from "@/lib/integrations/config";

export type RoyalOSIntegrationPublicStatus = {
  id: RoyalOSIntegrationId;
  name: string;
  shortName: string;
  description: string;
  category: RoyalOSIntegrationCategory;
  icon: string;
  color: string;
  authMode: "oauth" | "api_key" | "service_role" | "manual" | "planned";
  status: RoyalOSIntegrationStatus;
  requiredEnvironmentVariables: string[];
  missingEnvironmentVariables: string[];
  callbackPath?: string;
  capabilities: string[];
  allowedEmployees: string[];
  approvalRule: string;
  notes?: string;
};

export type SocialPublishingStatus =
  | "draft"
  | "awaiting_media"
  | "awaiting_approval"
  | "approved"
  | "scheduled"
  | "published";

export type SocialPublishingDraft = {
  id: string;
  title: string;
  workspace: string;
  sourceEmployee: string;
  contentType: string;
  caption: string;
  channels: string[];
  status: SocialPublishingStatus;
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  assetReference?: string;
  notes?: string;
};

export type IntegrationActivityItem = {
  id: string;
  createdAt: string;
  action: string;
  subject: string;
  result: "success" | "attention" | "information";
  detail: string;
};
