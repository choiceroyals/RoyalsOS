import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ROYALOS_BRANDS } from "@/lib/brands/config";
import type { BrandConnection, BrandConnectionState } from "@/lib/brands/types";
import { ROYALOS_INTEGRATIONS } from "@/lib/integrations/config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BRAND_PREFIX: Record<string, string> = {
  "brand-choiceroyals": "CHOICEROYALS",
  "brand-xena-grace": "XENAGRACE",
  "brand-td-talk": "TDTALK",
  "brand-triple-hay": "TRIPLEHAY",
};

const BRAND_TOKEN_KEYS: Record<string, string[]> = {
  facebook: ["META_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"],
  instagram: ["META_ACCESS_TOKEN", "INSTAGRAM_ACCOUNT_ID"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN"],
  x: ["X_ACCESS_TOKEN"],
  tiktok: ["TIKTOK_ACCESS_TOKEN"],
  youtube: ["GOOGLE_REFRESH_TOKEN", "YOUTUBE_CHANNEL_ID"],
  wordpress: ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APPLICATION_PASSWORD"],
  metricool: ["METRICOOL_API_TOKEN", "METRICOOL_USER_ID", "METRICOOL_BLOG_ID"],
  gmail: ["GOOGLE_REFRESH_TOKEN"],
  "google-drive": ["GOOGLE_REFRESH_TOKEN"],
  "google-calendar": ["GOOGLE_REFRESH_TOKEN"],
  stripe: ["STRIPE_SECRET_KEY"],
  printful: ["PRINTFUL_API_TOKEN"],
  github: ["GITHUB_TOKEN"],
  supabase: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  distrokid: [],
};

function hasValue(key: string): boolean {
  return typeof process.env[key] === "string" && Boolean(process.env[key]?.trim());
}

function hasRequiredValue(key: string): boolean {
  if (key === "NEXT_PUBLIC_SUPABASE_URL") {
    return hasValue("NEXT_PUBLIC_SUPABASE_URL") || hasValue("SUPABASE_URL");
  }
  return hasValue(key);
}

export function brandEnvironmentKey(brandId: string, suffix: string): string {
  const prefix = BRAND_PREFIX[brandId] ?? brandId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return `${prefix}_${suffix}`;
}

export function getBrandRequiredEnvironmentVariables(
  brandId: string,
  providerId: string,
): string[] {
  const integration = ROYALOS_INTEGRATIONS.find((item) => item.id === providerId);
  if (!integration || integration.authMode === "planned") return [];

  if (integration.authMode === "oauth") {
    return [
      ...new Set([
        ...integration.requiredEnvironmentVariables,
        "ROYALOS_CREDENTIAL_ENCRYPTION_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
      ]),
    ];
  }

  if (providerId === "supabase") {
    return [...integration.requiredEnvironmentVariables];
  }

  const brandKeys = (BRAND_TOKEN_KEYS[providerId] ?? []).map((suffix) =>
    brandEnvironmentKey(brandId, suffix),
  );

  return brandKeys.length > 0
    ? [...new Set(brandKeys)]
    : [...integration.requiredEnvironmentVariables];
}

async function configuredCredentialProviders(brandId: string): Promise<Set<string>> {
  const providers = new Set<string>();
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("brand_connection_credentials")
      .select("provider_id")
      .eq("brand_id", brandId)
      .eq("status", "active");
    if (error) return providers;
    for (const row of data ?? []) {
      if (typeof row.provider_id === "string") providers.add(row.provider_id);
    }
  } catch {
    // Supabase is optional during local prototype mode.
  }
  return providers;
}

function statusFromEnvironment(
  brandId: string,
  providerId: string,
  databaseConnected: boolean,
): { status: BrandConnectionState; required: string[]; missing: string[] } {
  const integration = ROYALOS_INTEGRATIONS.find((item) => item.id === providerId);
  if (!integration || integration.authMode === "planned") {
    return { status: "setup_required", required: [], missing: [] };
  }

  const required = getBrandRequiredEnvironmentVariables(brandId, providerId);
  const missing = required.filter((key) => !hasRequiredValue(key));

  if (databaseConnected) {
    return { status: "connected", required, missing };
  }

  if (integration.authMode === "oauth") {
    return {
      status: missing.length === 0 ? "credentials_ready" : "setup_required",
      required,
      missing,
    };
  }

  return {
    status:
      required.length > 0 && missing.length === 0
        ? "connected"
        : "setup_required",
    required,
    missing,
  };
}

export async function getBrandConnectionStatuses(brandId: string): Promise<BrandConnection[]> {
  const brand = ROYALOS_BRANDS.find((item) => item.id === brandId);
  if (!brand) return [];
  const databaseProviders = await configuredCredentialProviders(brandId);

  return ROYALOS_INTEGRATIONS.map((integration) => {
    const state = statusFromEnvironment(
      brandId,
      integration.id,
      databaseProviders.has(integration.id),
    );
    return {
      id: `${brandId}:${integration.id}`,
      brandId,
      providerId: integration.id,
      providerName: integration.name,
      status: state.status,
      permissions: [...integration.capabilities],
      assignedEmployees: [...integration.allowedEmployees],
      requiredEnvironmentVariables: state.required,
      missingEnvironmentVariables: state.missing,
      callbackPath:
        integration.authMode === "oauth"
          ? `/api/integrations/oauth/start?brandId=${encodeURIComponent(brandId)}&provider=${encodeURIComponent(integration.id)}`
          : undefined,
      lastAction:
        state.status === "connected"
          ? state.missing.length > 0
            ? "Connected; provider configuration needs attention"
            : "Encrypted brand authorization detected"
          : state.status === "credentials_ready"
            ? "Provider app and secure credential vault are ready"
            : integration.authMode === "planned"
              ? "Provider adapter is planned"
              : "Add the required server configuration",
    } satisfies BrandConnection;
  });
}

type EncryptedPayload = { ciphertext: string; iv: string; tag: string };

function encryptionKey(): Buffer {
  const value = process.env.ROYALOS_CREDENTIAL_ENCRYPTION_KEY;
  if (!value) throw new Error("ROYALOS_CREDENTIAL_ENCRYPTION_KEY is required to store OAuth credentials.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("ROYALOS_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptCredential(value: unknown): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCredential(payload: EncryptedPayload): unknown {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as unknown;
}

export async function saveBrandCredential(input: {
  brandId: string;
  providerId: string;
  tokenPayload: unknown;
  accountName?: string;
  externalAccountId?: string;
  expiresAt?: string;
  scopes?: string[];
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const encrypted = encryptCredential(input.tokenPayload);
  const { error } = await supabase.from("brand_connection_credentials").upsert(
    {
      brand_id: input.brandId,
      provider_id: input.providerId,
      account_name: input.accountName ?? null,
      external_account_id: input.externalAccountId ?? null,
      encrypted_payload: encrypted.ciphertext,
      encryption_iv: encrypted.iv,
      encryption_tag: encrypted.tag,
      token_expires_at: input.expiresAt ?? null,
      scopes: input.scopes ?? [],
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "brand_id,provider_id" },
  );
  if (error) throw new Error(`Could not save ${input.providerId} credential: ${error.message}`);
}
