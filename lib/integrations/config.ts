import type { RoyalOSEmployeeName } from "@/lib/employees/config";

export const ROYALOS_INTEGRATION_CATEGORIES = [
  "Social & Publishing",
  "Communication & Productivity",
  "Commerce & Finance",
  "Development & Storage",
  "Music & Distribution",
] as const;

export type RoyalOSIntegrationCategory =
  (typeof ROYALOS_INTEGRATION_CATEGORIES)[number];

export const ROYALOS_INTEGRATION_STATUSES = [
  "connected",
  "credentials_ready",
  "not_configured",
  "planned",
  "needs_attention",
] as const;

export type RoyalOSIntegrationStatus =
  (typeof ROYALOS_INTEGRATION_STATUSES)[number];

export type RoyalOSIntegrationDefinition = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: RoyalOSIntegrationCategory;
  icon: string;
  color: string;
  authMode: "oauth" | "api_key" | "service_role" | "manual" | "planned";
  requiredEnvironmentVariables: readonly string[];
  connectedEnvironmentVariables?: readonly string[];
  callbackPath?: string;
  capabilities: readonly string[];
  allowedEmployees: readonly RoyalOSEmployeeName[];
  approvalRule: string;
  notes?: string;
};

export const ROYALOS_INTEGRATIONS = [
  {
    id: "facebook",
    name: "Facebook",
    shortName: "Facebook",
    description: "Pages, post publishing, media publishing, comments, and engagement reporting.",
    category: "Social & Publishing",
    icon: "f",
    color: "#1877f2",
    authMode: "oauth",
    requiredEnvironmentVariables: ["META_APP_ID", "META_APP_SECRET"],
    connectedEnvironmentVariables: ["META_ACCESS_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/meta",
    capabilities: ["Draft posts", "Schedule posts", "Publish approved posts", "Read engagement"],
    allowedEmployees: ["Emmy", "Jack", "Cine", "Adedeji", "Sentinel"],
    approvalRule: "Publishing requires CEO approval until autonomous publishing is explicitly enabled.",
  },
  {
    id: "instagram",
    name: "Instagram",
    shortName: "Instagram",
    description: "Reels, images, captions, publishing preparation, and performance reporting.",
    category: "Social & Publishing",
    icon: "◎",
    color: "#e4405f",
    authMode: "oauth",
    requiredEnvironmentVariables: ["META_APP_ID", "META_APP_SECRET"],
    connectedEnvironmentVariables: ["META_ACCESS_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/meta",
    capabilities: ["Draft captions", "Queue Reels", "Publish approved media", "Read insights"],
    allowedEmployees: ["Emmy", "Jack", "Cine", "Nova", "Adedeji", "Sentinel"],
    approvalRule: "Publishing requires CEO approval until autonomous publishing is explicitly enabled.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    shortName: "LinkedIn",
    description: "Company updates, professional articles, campaign posts, and engagement reporting.",
    category: "Social & Publishing",
    icon: "in",
    color: "#0a66c2",
    authMode: "oauth",
    requiredEnvironmentVariables: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["LINKEDIN_ACCESS_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/linkedin",
    capabilities: ["Draft posts", "Publish approved updates", "Schedule content", "Read engagement"],
    allowedEmployees: ["Emmy", "Atlas", "Adedeji", "Sentinel"],
    approvalRule: "External publishing requires approval and an audit record.",
  },
  {
    id: "x",
    name: "X",
    shortName: "X",
    description: "Short-form updates, campaign threads, scheduled posts, and performance tracking.",
    category: "Social & Publishing",
    icon: "X",
    color: "#f5f5f5",
    authMode: "oauth",
    requiredEnvironmentVariables: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["X_ACCESS_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/x",
    capabilities: ["Draft posts", "Build threads", "Schedule posts", "Read engagement"],
    allowedEmployees: ["Emmy", "Atlas", "Adedeji", "Sentinel"],
    approvalRule: "External publishing requires approval and an audit record.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    shortName: "TikTok",
    description: "Short-form video publishing preparation, captions, scheduling, and analytics.",
    category: "Social & Publishing",
    icon: "♪",
    color: "#25f4ee",
    authMode: "oauth",
    requiredEnvironmentVariables: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["TIKTOK_ACCESS_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/tiktok",
    capabilities: ["Queue videos", "Draft captions", "Publish approved videos", "Read analytics"],
    allowedEmployees: ["Emmy", "Jack", "Cine", "Adedeji", "Sentinel"],
    approvalRule: "Video publishing requires approval until autonomous publishing is enabled.",
  },
  {
    id: "youtube",
    name: "YouTube",
    shortName: "YouTube",
    description: "Video uploads, Shorts, titles, descriptions, thumbnails, and channel analytics.",
    category: "Social & Publishing",
    icon: "▶",
    color: "#ff0033",
    authMode: "oauth",
    requiredEnvironmentVariables: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["GOOGLE_REFRESH_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/google",
    capabilities: ["Prepare uploads", "Upload approved videos", "Manage metadata", "Read analytics"],
    allowedEmployees: ["Emmy", "Jack", "Cine", "Atlas", "Adedeji", "Sentinel"],
    approvalRule: "Uploads and metadata changes require approval until the channel workflow is trusted.",
  },
  {
    id: "wordpress",
    name: "WordPress",
    shortName: "WordPress",
    description: "Website posts, landing-page drafts, media uploads, and publishing workflows.",
    category: "Social & Publishing",
    icon: "W",
    color: "#21759b",
    authMode: "manual",
    requiredEnvironmentVariables: ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APPLICATION_PASSWORD"],
    connectedEnvironmentVariables: ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APPLICATION_PASSWORD"],
    capabilities: ["Create drafts", "Upload media", "Publish approved content", "Read post status"],
    allowedEmployees: ["Emmy", "Nova", "Orion", "Adedeji", "Sentinel"],
    approvalRule: "Live website changes require approval and version history.",
  },
  {
    id: "metricool",
    name: "Metricool",
    shortName: "Metricool",
    description: "Cross-platform scheduling, publishing coordination, and social reporting.",
    category: "Social & Publishing",
    icon: "M",
    color: "#6f5cff",
    authMode: "api_key",
    requiredEnvironmentVariables: ["METRICOOL_API_TOKEN"],
    connectedEnvironmentVariables: ["METRICOOL_API_TOKEN"],
    capabilities: ["Schedule content", "Coordinate platforms", "Read campaign reports", "Track calendar"],
    allowedEmployees: ["Emmy", "Jack", "Cine", "Atlas", "Adedeji", "Sentinel"],
    approvalRule: "Scheduled and published items must retain the originating approval record.",
  },
  {
    id: "gmail",
    name: "Gmail",
    shortName: "Gmail",
    description: "Customer communication, executive email review, drafts, and records.",
    category: "Communication & Productivity",
    icon: "✉",
    color: "#ea4335",
    authMode: "oauth",
    requiredEnvironmentVariables: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["GOOGLE_REFRESH_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/google",
    capabilities: ["Read approved inboxes", "Create drafts", "Send approved email", "Archive records"],
    allowedEmployees: ["Janet", "Adedeji", "Michael P", "Sentinel"],
    approvalRule: "Sending email requires approval except for explicitly approved routine templates.",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    shortName: "Drive",
    description: "Company documents, media handoff, shared records, and project files.",
    category: "Communication & Productivity",
    icon: "△",
    color: "#34a853",
    authMode: "oauth",
    requiredEnvironmentVariables: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["GOOGLE_REFRESH_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/google",
    capabilities: ["Read approved folders", "Store documents", "Share files", "Archive mission output"],
    allowedEmployees: ["Adedeji", "Michael P", "Orion", "Nova", "Jack", "Cine", "Emmy", "Sentinel"],
    approvalRule: "Deletion and external sharing always require approval.",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    shortName: "Calendar",
    description: "Deadlines, meetings, content schedules, reminders, and mission timing.",
    category: "Communication & Productivity",
    icon: "▦",
    color: "#4285f4",
    authMode: "oauth",
    requiredEnvironmentVariables: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["GOOGLE_REFRESH_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/google",
    capabilities: ["Read schedule", "Create approved events", "Track deadlines", "Coordinate reminders"],
    allowedEmployees: ["Adedeji", "Titan", "Emmy", "Jack", "Cine", "Sentinel"],
    approvalRule: "External invitations and destructive changes require approval.",
  },
  {
    id: "stripe",
    name: "Stripe",
    shortName: "Stripe",
    description: "Revenue visibility, billing events, payouts, and transaction records.",
    category: "Commerce & Finance",
    icon: "$",
    color: "#635bff",
    authMode: "api_key",
    requiredEnvironmentVariables: ["STRIPE_SECRET_KEY"],
    connectedEnvironmentVariables: ["STRIPE_SECRET_KEY"],
    capabilities: ["Read transactions", "Prepare revenue reports", "Track payouts", "Reconcile records"],
    allowedEmployees: ["Michael P", "Tyson", "Adedeji", "Sentinel"],
    approvalRule: "RoyalOS may read financial activity; refunds, transfers, and billing changes require CEO approval.",
  },
  {
    id: "printful",
    name: "Printful",
    shortName: "Printful",
    description: "Product catalog, orders, fulfillment status, and commerce operations.",
    category: "Commerce & Finance",
    icon: "P",
    color: "#ff4f5a",
    authMode: "api_key",
    requiredEnvironmentVariables: ["PRINTFUL_API_TOKEN"],
    connectedEnvironmentVariables: ["PRINTFUL_API_TOKEN"],
    capabilities: ["Read products", "Read orders", "Track fulfillment", "Prepare operational reports"],
    allowedEmployees: ["Titan", "Michael P", "Tyson", "Adedeji", "Sentinel"],
    approvalRule: "Order changes, cancellations, and product publishing require approval.",
  },
  {
    id: "github",
    name: "GitHub",
    shortName: "GitHub",
    description: "Repository access, issue tracking, code review, and deployment preparation.",
    category: "Development & Storage",
    icon: "GH",
    color: "#e6edf3",
    authMode: "oauth",
    requiredEnvironmentVariables: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    connectedEnvironmentVariables: ["GITHUB_TOKEN"],
    callbackPath: "/api/integrations/oauth/callback/github",
    capabilities: ["Read repositories", "Create branches", "Prepare pull requests", "Review changes"],
    allowedEmployees: ["Orion", "Adedeji", "Sentinel"],
    approvalRule: "Merging, deployment, deletion, and secret changes require CEO approval.",
  },
  {
    id: "supabase",
    name: "Supabase",
    shortName: "Supabase",
    description: "RoyalOS database, authentication, storage, company memory, and audit records.",
    category: "Development & Storage",
    icon: "S",
    color: "#3ecf8e",
    authMode: "service_role",
    requiredEnvironmentVariables: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    connectedEnvironmentVariables: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    capabilities: ["Store records", "Store assets", "Read company data", "Maintain audit history"],
    allowedEmployees: ["Orion", "Michael P", "Adedeji", "Cine", "Nova", "Sentinel"],
    approvalRule: "Schema changes, destructive queries, and access-policy changes require approval.",
  },
  {
    id: "distrokid",
    name: "DistroKid",
    shortName: "DistroKid",
    description: "Music-distribution workflow and release-status coordination for Xena Grace.",
    category: "Music & Distribution",
    icon: "♫",
    color: "#f4c84a",
    authMode: "planned",
    requiredEnvironmentVariables: [],
    capabilities: ["Track release checklist", "Store release metadata", "Coordinate launch mission"],
    allowedEmployees: ["Emmy", "Jack", "Cine", "Michael P", "Adedeji"],
    approvalRule: "Release submissions, ownership changes, and payout settings always require CEO approval.",
    notes: "Provider connection method must be confirmed before implementation. RoyalOS currently prepares the internal release workflow only.",
  },
] as const satisfies readonly RoyalOSIntegrationDefinition[];

export type RoyalOSIntegrationId =
  (typeof ROYALOS_INTEGRATIONS)[number]["id"];

export const ROYALOS_INTEGRATION_BY_ID = Object.fromEntries(
  ROYALOS_INTEGRATIONS.map((integration) => [integration.id, integration])
) as unknown as Record<RoyalOSIntegrationId, RoyalOSIntegrationDefinition>;

export function isRoyalOSIntegrationId(value: unknown): value is RoyalOSIntegrationId {
  return typeof value === "string" && value in ROYALOS_INTEGRATION_BY_ID;
}
