import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ROYALOS_BRANDS } from "@/lib/brands/config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildOAuthAuthorization,
  createCodeVerifier,
  getOAuthSetupStatus,
  getPublicUrl,
  resolveOAuthProvider,
  type OAuthSession,
} from "@/lib/integrations/oauth";

export const dynamic = "force-dynamic";

async function checkCredentialVault(): Promise<string | null> {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("brand_connection_credentials")
      .select("brand_id")
      .limit(1);

    if (error) {
      return `Supabase credential vault is not ready: ${error.message}`;
    }
    return null;
  } catch (error) {
    return error instanceof Error
      ? `Supabase credential vault is not ready: ${error.message}`
      : "Supabase credential vault is not ready.";
  }
}

function returnToConnections(input: {
  brandId: string;
  provider: string;
  message: string;
}) {
  const target = new URL("/", getPublicUrl());
  target.searchParams.set("section", "Connections");
  target.searchParams.set("brand", input.brandId);
  target.searchParams.set("provider", input.provider);
  target.searchParams.set("connectionError", input.message);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const brandId = requestUrl.searchParams.get("brandId") || "";
  const requestedProvider = requestUrl.searchParams.get("provider") || "";
  const mode = requestUrl.searchParams.get("mode") || "start";
  const provider = resolveOAuthProvider(requestedProvider);

  if (!ROYALOS_BRANDS.some((brand) => brand.id === brandId)) {
    return NextResponse.json(
      { error: "A valid brand is required." },
      { status: 400 },
    );
  }

  if (!provider) {
    const message =
      "This provider uses manual or API-key setup instead of OAuth.";
    return mode === "check"
      ? NextResponse.json({ ready: false, error: message }, { status: 400 })
      : returnToConnections({ brandId, provider: requestedProvider, message });
  }

  const setup = getOAuthSetupStatus(provider);
  let vaultIssue: string | null = null;
  if (setup.ready) {
    vaultIssue = await checkCredentialVault();
  }

  const ready = setup.ready && !vaultIssue;
  const issues = [
    ...setup.missingEnvironmentVariables,
    ...(vaultIssue ? [vaultIssue] : []),
  ];

  if (mode === "check") {
    return NextResponse.json({
      ready,
      provider,
      requestedProvider,
      brandId,
      missingEnvironmentVariables: setup.missingEnvironmentVariables,
      issues,
      callbackPath: `/api/integrations/oauth/start?brandId=${encodeURIComponent(brandId)}&provider=${encodeURIComponent(requestedProvider)}`,
      message: ready
        ? "Provider application and secure credential vault are ready."
        : "Complete the missing server configuration before authorization.",
    });
  }

  if (!ready) {
    return returnToConnections({
      brandId,
      provider: requestedProvider,
      message:
        issues.length > 0
          ? `Connection setup is incomplete: ${issues.join("; ")}`
          : "Connection setup is incomplete.",
    });
  }

  try {
    const nonce = randomBytes(24).toString("hex");
    const codeVerifier = provider === "x" ? createCodeVerifier() : undefined;
    const authorization = buildOAuthAuthorization({
      provider,
      requestedProvider,
      brandId,
      nonce,
      codeVerifier,
    });
    const session: OAuthSession = {
      nonce,
      provider,
      requestedProvider,
      brandId,
      redirectUri: authorization.redirectUri,
      codeVerifier,
      createdAt: new Date().toISOString(),
    };
    const response = NextResponse.redirect(authorization.url);
    response.cookies.set(
      "royalos_oauth_session",
      Buffer.from(JSON.stringify(session)).toString("base64url"),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/integrations/oauth",
        maxAge: 10 * 60,
      },
    );
    return response;
  } catch (error) {
    return returnToConnections({
      brandId,
      provider: requestedProvider,
      message:
        error instanceof Error
          ? error.message
          : "OAuth setup could not start.",
    });
  }
}
