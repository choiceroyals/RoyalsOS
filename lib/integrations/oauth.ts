import "server-only";

import { createHash, randomBytes } from "node:crypto";

export type OAuthProviderId = "meta" | "google" | "linkedin" | "x" | "tiktok" | "github";


const OAUTH_PROVIDER_ENVIRONMENT: Record<OAuthProviderId, string[]> = {
  meta: ["META_APP_ID", "META_APP_SECRET"],
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  linkedin: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  x: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
  tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
};

function hasEnvironmentValue(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function getOAuthSetupStatus(provider: OAuthProviderId): {
  ready: boolean;
  missingEnvironmentVariables: string[];
} {
  const missingEnvironmentVariables = OAUTH_PROVIDER_ENVIRONMENT[provider].filter(
    (name) => !hasEnvironmentValue(name),
  );

  if (!hasEnvironmentValue("ROYALOS_CREDENTIAL_ENCRYPTION_KEY")) {
    missingEnvironmentVariables.push("ROYALOS_CREDENTIAL_ENCRYPTION_KEY");
  }
  if (!hasEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY")) {
    missingEnvironmentVariables.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (
    !hasEnvironmentValue("SUPABASE_URL") &&
    !hasEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL")
  ) {
    missingEnvironmentVariables.push(
      "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)",
    );
  }

  return {
    ready: missingEnvironmentVariables.length === 0,
    missingEnvironmentVariables,
  };
}
export type OAuthSession = {
  nonce: string;
  provider: OAuthProviderId;
  requestedProvider: string;
  brandId: string;
  redirectUri: string;
  codeVerifier?: string;
  createdAt: string;
};

function base64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function createCodeVerifier(): string {
  return base64Url(randomBytes(48));
}

export function createCodeChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function resolveOAuthProvider(provider: string): OAuthProviderId | null {
  if (["facebook", "instagram"].includes(provider)) return "meta";
  if (["youtube", "gmail", "google-drive", "google-calendar"].includes(provider)) return "google";
  if (provider === "linkedin") return "linkedin";
  if (provider === "x") return "x";
  if (provider === "tiktok") return "tiktok";
  if (provider === "github") return "github";
  return null;
}

export function getPublicUrl(): string {
  const value = process.env.ROYALOS_PUBLIC_URL?.trim() || "http://localhost:3000";
  return value.replace(/\/$/, "");
}

export function buildOAuthAuthorization(input: {
  provider: OAuthProviderId;
  requestedProvider: string;
  brandId: string;
  nonce: string;
  codeVerifier?: string;
}): { url: string; redirectUri: string } {
  const redirectUri = `${getPublicUrl()}/api/integrations/oauth/callback/${input.provider}`;
  const state = input.nonce;

  switch (input.provider) {
    case "meta": {
      const appId = process.env.META_APP_ID;
      if (!appId) throw new Error("META_APP_ID is missing.");
      const version = process.env.META_GRAPH_API_VERSION || "v25.0";
      const defaultScopes = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_insights",
        "business_management",
      ];
      const scopes = (process.env.META_OAUTH_SCOPES || defaultScopes.join(","))
        .split(/[\s,]+/)
        .map((scope) => scope.trim())
        .filter(Boolean);
      const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
      url.searchParams.set("client_id", appId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("scope", scopes.join(","));
      url.searchParams.set("response_type", "code");
      return { url: url.toString(), redirectUri };
    }
    case "google": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error("GOOGLE_CLIENT_ID is missing.");
      const commonScopes = ["openid", "email", "profile"];
      const productScopes: Record<string, string[]> = {
        youtube: [
          "https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.readonly",
        ],
        gmail: ["https://www.googleapis.com/auth/gmail.modify"],
        "google-drive": ["https://www.googleapis.com/auth/drive.file"],
        "google-calendar": ["https://www.googleapis.com/auth/calendar"],
      };
      const scopes = [...commonScopes, ...(productScopes[input.requestedProvider] ?? [])];
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", scopes.join(" "));
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
      url.searchParams.set("include_granted_scopes", "true");
      url.searchParams.set("state", state);
      return { url: url.toString(), redirectUri };
    }
    case "linkedin": {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      if (!clientId) throw new Error("LINKEDIN_CLIENT_ID is missing.");
      const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      const scopes = process.env.LINKEDIN_OAUTH_SCOPES || "openid profile email w_member_social";
      url.searchParams.set("scope", scopes);
      return { url: url.toString(), redirectUri };
    }
    case "x": {
      const clientId = process.env.X_CLIENT_ID;
      if (!clientId) throw new Error("X_CLIENT_ID is missing.");
      if (!input.codeVerifier) throw new Error("X OAuth requires a PKCE verifier.");
      const url = new URL("https://x.com/i/oauth2/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", createCodeChallenge(input.codeVerifier));
      url.searchParams.set("code_challenge_method", "S256");
      return { url: url.toString(), redirectUri };
    }
    case "tiktok": {
      const clientKey = process.env.TIKTOK_CLIENT_KEY;
      if (!clientKey) throw new Error("TIKTOK_CLIENT_KEY is missing.");
      const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
      url.searchParams.set("client_key", clientKey);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "user.info.basic,video.publish,video.upload");
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      return { url: url.toString(), redirectUri };
    }
    case "github": {
      const clientId = process.env.GITHUB_CLIENT_ID;
      if (!clientId) throw new Error("GITHUB_CLIENT_ID is missing.");
      const url = new URL("https://github.com/login/oauth/authorize");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", "repo read:org workflow");
      url.searchParams.set("state", state);
      return { url: url.toString(), redirectUri };
    }
  }
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = Object.fromEntries(new URLSearchParams(text));
  }
  if (!response.ok) {
    const message =
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
          ? payload.error
          : `OAuth token exchange failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

export async function exchangeOAuthCode(
  session: OAuthSession,
  code: string,
): Promise<Record<string, unknown>> {
  switch (session.provider) {
    case "meta": {
      const version = process.env.META_GRAPH_API_VERSION || "v25.0";
      const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
      url.searchParams.set("client_id", process.env.META_APP_ID || "");
      url.searchParams.set("client_secret", process.env.META_APP_SECRET || "");
      url.searchParams.set("redirect_uri", session.redirectUri);
      url.searchParams.set("code", code);
      return readJsonResponse(await fetch(url));
    }
    case "google": {
      return readJsonResponse(
        await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            code,
            grant_type: "authorization_code",
            redirect_uri: session.redirectUri,
          }),
        }),
      );
    }
    case "linkedin": {
      return readJsonResponse(
        await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: process.env.LINKEDIN_CLIENT_ID || "",
            client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
            redirect_uri: session.redirectUri,
          }),
        }),
      );
    }
    case "x": {
      const params = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: process.env.X_CLIENT_ID || "",
        redirect_uri: session.redirectUri,
        code_verifier: session.codeVerifier || "",
      });
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (process.env.X_CLIENT_SECRET) {
        headers.Authorization = `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64")}`;
      }
      return readJsonResponse(
        await fetch("https://api.x.com/2/oauth2/token", {
          method: "POST",
          headers,
          body: params,
        }),
      );
    }
    case "tiktok": {
      return readJsonResponse(
        await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY || "",
            client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
            code,
            grant_type: "authorization_code",
            redirect_uri: session.redirectUri,
          }),
        }),
      );
    }
    case "github": {
      return readJsonResponse(
        await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: session.redirectUri,
          }),
        }),
      );
    }
  }
}
